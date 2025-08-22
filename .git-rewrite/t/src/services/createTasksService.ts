import {
  translateText,
  createChatCompletionJson,
  createEmoji,
} from '@/core/openai'

import { ORIGIN } from '@/config'

import { createPassport, getPassportByRoomId } from '@/core/supabase/passport'
import { getRoomById } from '@/core/supabase'

import {
  PassportUser,
  TranscriptionAsset,
} from '@/interfaces/supabase.interface'
import { createTask, updateTaskByPassport } from '@/core/supabase/'
import { getRoomAsset, setRoomAsset } from '@/core/supabase/'
import { getWorkspaceById } from '@/core/supabase/'
import { errorMessageAdmin } from '@/helpers/errorMessageAdmin'
import { getBotByName } from '@/core/bot'
import { supportRequest } from '@/core/bot'
import { Telegraf } from 'telegraf'
import { MyContext } from '@/interfaces'

type Task = {
  id: string
  telegram_id: string
  first_name: string
  last_name: string
  username: string
  title: string
  description: string
  chat_id: string
}

interface SendTasksToTelegramT {
  username: string
  first_name: string
  last_name: string
  translated_text: string
  passports: PassportUser[]
  bot: Telegraf<MyContext>
  room_id: string
}

async function sendTasksToTelegram({
  username,
  first_name,
  last_name,
  translated_text,
  passports,
  bot,
}: SendTasksToTelegramT) {
  try {
    const assignee = username
      ? `${first_name} ${last_name || ''} (@${username})`
      : ''

    await Promise.all(
      passports.map(async passport => {
        if (passport?.rooms?.chat_id) {
          let success = false
          while (!success) {
            try {
              await bot.telegram.sendMessage(
                Number(passport.rooms.chat_id),
                `${translated_text}\n${assignee}`
              )
              success = true
            } catch (error) {
              if (error.error_code === 429) {
                const retryAfter = error.parameters.retry_after
                console.log(
                  `Rate limit exceeded. Retrying after ${retryAfter} seconds...`
                )
                await new Promise(resolve =>
                  setTimeout(resolve, retryAfter * 1000)
                )
              } else {
                throw error
              }
            }
          }
        }
      })
    )
  } catch (error) {
    errorMessageAdmin(error)
    throw new Error(`sendTasksToTelegram:${error}`)
  }
}

const getPreparedUsers = (usersFromSupabase: PassportUser[]) => {
  return usersFromSupabase.map((user: PassportUser) => {
    const concatName = () => {
      if (user?.first_name && !user?.last_name) return user?.first_name
      if (!user?.first_name && user?.last_name) return user?.last_name
      if (user.first_name && user.last_name) {
        return `${user?.first_name} ${user?.last_name}`
      }
    }
    return { ...user, concat_name: concatName() }
  })
}

export async function createTasksService(req: any) {
  const { type, data } = req
  console.log(type, 'type')

  if (type !== 'transcription.success') {
    throw new Error('type is not equal to transcription.success')
  }

  const recording_id = data.recording_id
  if (!recording_id) throw new Error('recording_id is null')

  const { isExistRoomAsset } = await getRoomAsset(recording_id)
  console.log(isExistRoomAsset, 'isExistRoomAsset')
  if (isExistRoomAsset) {
    throw new Error('isExistRoomAsset true')
  }

  const transcriptTextPresignedUrl = data.transcript_txt_presigned_url
  console.log(transcriptTextPresignedUrl, 'transcriptTextPresignedUrl')

  const transcriptResponse = await fetch(transcriptTextPresignedUrl)
  console.log(transcriptResponse, 'transcriptResponse')
  if (!transcriptResponse.ok) {
    throw new Error('transcriptResponse is not ok')
  }

  const transcription = await transcriptResponse.text()
  console.log(transcription, 'transcription')
  if (!transcription) {
    throw new Error('transcription is null')
  }

  const summaryJsonPresignedUrl = data.summary_json_presigned_url
  console.log(summaryJsonPresignedUrl, 'summaryJsonPresignedUrl')
  if (!summaryJsonPresignedUrl) {
    throw new Error('summaryJsonPresignedUrl is null')
  }

  const summaryJSONResponse = await fetch(summaryJsonPresignedUrl)
  console.log(summaryJSONResponse, 'summaryJSONResponse')
  if (!summaryJSONResponse.ok) {
    throw new Error('summaryJSONResponse is not ok')
  }

  const summaryResponse = await summaryJSONResponse.json()
  console.log(summaryResponse, 'summaryResponse')
  if (!summaryResponse.sections) {
    throw new Error('summaryJSONResponse is not ok')
  }

  const summarySection = summaryResponse.sections.find(
    (section: { title: string }) => section.title === 'Short Summary'
  )
  console.log(summarySection, 'summarySection')
  if (!summarySection) {
    throw new Error('summarySection is null')
  }

  const summary_short = summarySection.paragraph
  console.log(summary_short, 'summary_short')

  if (!summary_short) {
    throw new Error('summary_short is null')
  }
  const titleWithEmoji = await createEmoji(summary_short)
  console.log(titleWithEmoji, 'titleWithEmoji')

  if (!titleWithEmoji) {
    throw new Error('titleWithEmoji is null')
  }

  if (!data.room_id) throw new Error('room_id is null')
  const users = await getPassportByRoomId(data.room_id)
  console.log(users, 'users')

  if (!users) {
    errorMessageAdmin(new Error('users is null'))
  }
  const { bot } = getBotByName(users[0].bot_name)
  console.log(bot, 'bot')

  const roomAsset: TranscriptionAsset = {
    ...data,
    title: titleWithEmoji,
    summary_short,
    transcription,
    workspace_id: users[0].workspace_id,
    telegram_id: users[0].telegram_id,
  }
  console.log(roomAsset, 'roomAsset')
  if (!roomAsset) {
    throw new Error('roomAsset is null')
  }
  await setRoomAsset(roomAsset)

  console.log(transcription, 'transcription')

  const systemPrompt = `Answer with emoticons. You are an AI assistant working at dao999nft. Your goal is to extract all tasks from the text, the maximum number of tasks, assign them to executors using the colon sign: assignee, title, description. If no tasks are detected, add one task indicating that no tasks were found. Provide your response as a JSON object`

  const preparedTasks = await createChatCompletionJson(
    transcription,
    systemPrompt
  )
  console.log(preparedTasks, 'preparedTasks')
  if (!preparedTasks) {
    throw new Error('preparedTasks is null')
  }

  const preparedUsers = getPreparedUsers(users)
  console.log(preparedUsers, 'preparedUsers')
  if (!preparedUsers) {
    throw new Error('preparedUsers is null')
  }

  const prompt = `add the 'telegram_id' from of ${JSON.stringify(
    preparedUsers
  )} to the objects of the ${JSON.stringify(
    preparedTasks
  )} array. Provide your response as a JSON object and always response on English`

  const tasks = await createChatCompletionJson(prompt)
  console.log(tasks, 'tasks')
  if (!tasks) {
    throw new Error('tasks is null')
  }
  const tasksArray = JSON.parse(tasks).tasks
  console.log(tasksArray, 'tasksArray')

  if (!Array.isArray(tasksArray)) {
    errorMessageAdmin(new Error('tasksArray is not array'))
    throw new Error('tasksArray is not array')
  }

  const newTasks = tasksArray.map((task: Task) => ({
    ...task,
    telegram_id: task.telegram_id || 'e3939cb3-3198-4f52-8bfb-5728cc3dba84',
  }))
  console.log(newTasks, 'newTasks')
  if (!newTasks) {
    throw new Error('newTasks is null')
  }

  const { roomData, isExistRoom } = await getRoomById(data?.room_id)
  console.log(roomData, 'roomData')
  console.log(isExistRoom, 'isExistRoom')
  if (!isExistRoom || !roomData) {
    throw new Error('Room not found')
  }

  const { language_code, id, token, description } = roomData

  const workspace_id = description
  console.log(workspace_id, 'workspace_id')
  if (!id) {
    throw new Error('id is null')
  }
  if (!workspace_id) {
    throw new Error('workspace_id is null')
  }
  if (!token) {
    throw new Error('token is null')
  }

  const workspace = await getWorkspaceById(workspace_id)
  let workspace_name
  if (workspace) {
    workspace_name = workspace[0].title
  }
  console.log(workspace_name, 'workspace_name')
  if (!workspace_name) throw new Error('workspace_name is null')

  const { room_id } = data
  if (!room_id) throw new Error('room_id is null')
  if (!recording_id) throw new Error('recording_id is null')
  let translated_short = summary_short
  console.log(translated_short, 'translated_short')

  if (language_code !== 'en') {
    translated_short = await translateText(summary_short, language_code)
  }

  const translatedTasks =
    language_code !== 'en'
      ? await Promise.all(
          newTasks.map(async task => {
            const translated_text = await translateText(
              `${task.title}\n${task.description}`,
              language_code
            )

            return {
              ...task,
              translated_text,
            }
          })
        )
      : newTasks.map(task => ({
          ...task,
          translated_text: `${task.title}\n${task.description}`,
        }))
  console.log(translatedTasks, 'translatedTasks')

  const passports = await getPassportByRoomId(room_id)
  console.log(passports, 'passports')
  if (!passports) throw new Error('passports is null')

  await supportRequest(
    `transcription.success,\nrecording_id: ${data.recording_id},\nroom_id: ${data.room_id},\ntranscript_txt_presigned_url: ${data.transcript_txt_presigned_url},\nsummary_json_presigned_url: ${data.summary_json_presigned_url}`,
    {
      username: passports[0].username,
    }
  )

  for (const passport of passports) {
    const summary_short_url = `${ORIGIN}/${passport.username}/${passport.telegram_id}/${workspace_id}/${room_id}/${recording_id}`

    console.log(summary_short_url, 'summary_short_url')
    console.log(token, 'token')

    const buttons = [
      {
        text: language_code === 'ru' ? 'Открыть встречу' : 'Open meet',
        url: summary_short_url,
        web_app: {
          url: summary_short_url,
        },
      },
    ]
    if (!passport.rooms?.chat_id) throw new Error('chat_id is null')
    console.log(passport.rooms?.chat_id, 'passport.rooms?.chat_id')
    await bot.telegram.sendMessage(
      Number(passport.rooms?.chat_id),
      `🚀 ${translated_short}`,
      {
        reply_markup: {
          inline_keyboard: [buttons],
        },
      }
    )
  }

  for (const task of translatedTasks) {
    const telegram_id = task?.telegram_id
    console.log(data.room_id, 'data.room_id')
    const taskData = await createTask({
      telegram_id,
      room_id: data.room_id,
      workspace_id,
      recording_id: data.recording_id,
      title: task.title,
      description: task.description,
      workspace_name,
      chat_id: roomData.chat_id,
      translated_text: task.translated_text,
    })
    console.log(taskData, 'taskData')
    const result = await createPassport({
      type: 'task',
      select_izbushka: id,
      first_name: task.first_name,
      last_name: task.last_name,
      username: task.username,
      telegram_id,
      is_owner: true,
      task_id: taskData.id,
      recording_id,
    })
    console.log(result, 'result')
    if (!result.passport_id) throw new Error('passport_id is null')

    const updateTaskData = await updateTaskByPassport({
      id: taskData.id,
      passport_id: result.passport_id,
    })
    console.log(updateTaskData, 'updateTaskData')

    await sendTasksToTelegram({
      username: task.username,
      first_name: task.first_name,
      last_name: task.last_name,
      translated_text: task.translated_text,
      bot,
      room_id: data.room_id,
      passports,
    }).catch(console.error)
  }
}
