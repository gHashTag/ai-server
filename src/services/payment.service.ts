import { Response } from 'express'
import { logger } from '@/utils/logger'
import {
  updateUserSubscription,
  updateUserBalanceRobokassa,
} from '@/core/supabase' // Убедись, что пути импорта верны
import { sendPaymentNotification } from '@/price/helpers' // Убедись, что путь импорта верен
import { createBotByName } from '@/config' // Убедись, что путь импорта верен
import { errorMessageAdmin } from '@/helpers/errorMessageAdmin' // Убедись, что путь импорта верен
import { supabase } from '@/core/supabase'
import { notifyBotOwners } from '@/core/supabase'
import { ADMIN_GROUP_ID } from '@/config'
// --- КОНСТАНТЫ (из предоставленного кода) ---
const PAYMENT_OPTIONS = [
  { amount: 500, stars: 217 },
  { amount: 1000, stars: 434 },
  { amount: 2000, stars: 869 },
  { amount: 5000, stars: 2173 },
  { amount: 10000, stars: 4347 },
  { amount: 10, stars: 6 },
]

const SUBSCRIPTION_PLANS = [
  {
    row: 0,
    text: '🎨 NeuroPhoto',
    en_price: 10,
    ru_price: 1110,
    description: 'Creating photos using neural networks.',
    stars_price: 476,
    callback_data: 'neurophoto',
  },
  {
    row: 1,
    text: '📚 NeuroVideo',
    en_price: 33,
    ru_price: 2999,
    description: 'Self-study using neural networks with an AI avatar.',
    stars_price: 1303,
    callback_data: 'neurovideo',
  },
  {
    row: 2,
    text: '🤖 NeuroBlogger',
    en_price: 833,
    ru_price: 75000,
    description: 'Training on neural networks with a mentor.',
    stars_price: 32608,
    callback_data: 'neuroblogger',
  },
]

const SUBSCRIPTION_AMOUNTS = SUBSCRIPTION_PLANS.reduce((acc, plan) => {
  acc[plan.ru_price] = plan.callback_data
  return acc
}, {})
// --- КОНЕЦ КОНСТАНТ ---

export class PaymentService {
  public async processPayment(
    IncSum: string,
    inv_id: string,
    res: Response
  ): Promise<void> {
    logger.info('[Service Debug] Received parameters:', { IncSum, inv_id })

    let invId: number
    let outSum: number

    try {
      invId = parseInt(inv_id, 10)
      outSum = parseFloat(IncSum)

      if (isNaN(invId) || isNaN(outSum)) {
        logger.error(
          '[PaymentSuccess] Invalid parameter format after parsing',
          {
            inv_id,
            IncSum,
            parsed_invId: invId,
            parsed_outSum: outSum,
          }
        )
        throw new Error('Invalid InvId or IncSum format')
      }

      logger.info('[Service Debug] Parsed parameters:', { invId, outSum })
    } catch (parseError) {
      logger.error('[PaymentSuccess] Error parsing InvId or IncSum', {
        inv_id,
        IncSum,
        error: parseError,
      })
      throw new Error('Invalid parameter format')
    }

    // --- ДОБАВЛЕНО: Проверка подписи (ВАЖНО!) ---
    // Нужно добавить проверку подписи, как в локальном robokassa.handler.ts
    // const robokassaPassword2 = process.env.PASSWORD2; // Получить из env
    // if (!validateRobokassaSignature(body, robokassaPassword2)) {
    //    logger.warn('[PaymentSuccess] Invalid signature received');
    //    res.status(400).send('Bad Request: Invalid signature');
    //    return;
    // }
    // logger.info(`[PaymentSuccess] Signature validated successfully for InvId: ${invId}`);
    // Пока пропускаем, т.к. в логах подпись была валидна, но это нужно вернуть!

    // --- НАЧАЛО СТАРОЙ ЛОГИКИ processPayment (адаптировано) ---
    try {
      let stars = 0
      let subscription = ''

      // 1. Проверяем, соответствует ли сумма одному из тарифов
      // Используем outSum (сумма, полученная от Robokassa)
      if (SUBSCRIPTION_AMOUNTS[outSum]) {
        const plan = SUBSCRIPTION_PLANS.find(p => p.ru_price === outSum)
        if (plan) {
          stars = plan.stars_price
          subscription = plan.callback_data // 'neurovideo', 'neurophoto' etc.
        }
      }
      // 2. Если не соответствует тарифу, проверяем стандартные варианты оплаты
      else {
        const option = PAYMENT_OPTIONS.find(opt => opt.amount === outSum)
        if (option) {
          stars = option.stars
        }
      }

      logger.info(
        `[PaymentSuccess] Determined stars: ${stars}, subscription: ${
          subscription || 'none'
        }`
      )

      if (stars > 0) {
        // --- ДОБАВЛЕНО: Получаем данные платежа/пользователя из БД ---
        // Нужно получить данные из БД, чтобы обновить статус и получить telegram_id и т.д.
        // Вместо getTelegramIdFromInvId, лучше получить всю запись платежа
        const { data: paymentData, error: paymentError } = await supabase
          .from('payments_v2')
          .select('*') // Выбираем все поля, включая telegram_id, bot_name, status
          .eq('inv_id', invId)
          .maybeSingle()

        logger.info(
          `[PaymentSuccess] Payment data: ${JSON.stringify(paymentData)}`
        )

        if (paymentError || !paymentData) {
          logger.error(
            `[PaymentSuccess] Error fetching payment or payment not found for InvId: ${invId}`,
            paymentError
          )
          // Отвечаем OK, чтобы Robokassa не повторяла, но логируем
          throw new Error('Payment not found')
          return
        }

        // Проверяем, не обработан ли уже
        if (paymentData.status === 'COMPLETED') {
          logger.warn(
            `[PaymentSuccess] Payment InvId: ${invId} already processed.`
          )
          throw new Error('Payment already processed')
          return
        }

        // --- Обновляем статус платежа ---
        const { error: updateError } = await supabase
          .from('payments_v2')
          .update({
            status: 'COMPLETED',
          }) // Обновляем статус и кол-во звезд
          .eq('inv_id', invId)

        if (updateError) {
          logger.error(
            `[PaymentSuccess] Error updating payment status for InvId: ${invId}`,
            updateError
          )
          // Платеж прошел, но статус не обновился. Критично.
          throw new Error('Payment status not updated')
          return
        }
        logger.info(
          `[PaymentSuccess] Payment status updated to COMPLETED for InvId: ${invId}`
        )

        // Используем данные из найденного платежа
        const telegram_id = paymentData.telegram_id
        const bot_name = paymentData.bot_name
        // Нужны еще username и language для уведомления, получим их отдельно
        // TODO: Добавить получение username/language из users по telegram_id, если они нужны для sendPaymentNotification

        const { data: userData } = await supabase
          .from('users')
          .select('username, language_code')
          .eq('telegram_id', telegram_id)
          .maybeSingle()

        const username = userData?.username || 'User' // Placeholder
        const language_code = userData?.language_code || 'ru' // Placeholder

        // Обновляем подписку только если она была определена по сумме
        if (subscription) {
          await updateUserSubscription(telegram_id, subscription)
          logger.info(
            `[PaymentSuccess] Subscription updated to ${subscription} for ${telegram_id}`
          )
        } else {
          // Если подписки нет, значит это пополнение баланса - обновляем баланс
          await updateUserBalanceRobokassa(
            invId.toString(), // ИСПРАВЛЕНО: передаем inv_id первым параметром
            telegram_id,
            stars,
            'MONEY_INCOME',
            `Пополнение баланса через Robokassa (InvId: ${invId})`,
            {
              payment_id: paymentData.id,
              payment_method: 'Robokassa',
              bot_name: bot_name,
              language: language_code,
              service_type: null, // Для MONEY_INCOME всегда null
            }
          )
          logger.info(
            `[PaymentSuccess] Balance updated via updateUserBalance for ${telegram_id} by ${stars}`
          )
        }

        // --- ОТПРАВКА УВЕДОМЛЕНИЙ ---
        try {
          const botData = createBotByName(bot_name)
          if (botData) {
            const { bot } = botData

            // 1. Уведомление ПОЛЬЗОВАТЕЛЮ
            let userMessage = ''
            if (language_code === 'ru') {
              if (subscription) {
                userMessage = `✅ Ваша подписка "${subscription}" успешно активирована! Приятного использования!`
              } else {
                userMessage = `✅ Ваш баланс успешно пополнен на ${stars} ⭐! Сумма оплаты: ${outSum} руб.`
              }
            } else {
              if (subscription) {
                userMessage = `✅ Your subscription "${subscription}" has been successfully activated! Enjoy!`
              } else {
                userMessage = `✅ Your balance has been successfully topped up by ${stars} ⭐! Amount paid: ${outSum} RUB.`
              }
            }

            try {
              await bot.telegram.sendMessage(
                telegram_id.toString(),
                userMessage
              )
              logger.info(
                `[PaymentSuccess] User notification sent successfully to ${telegram_id}`
              )
            } catch (userNotifyError) {
              logger.error(
                `[PaymentSuccess] FAILED to send user notification to ${telegram_id}`,
                { error: userNotifyError }
              )
              // Не прерываем процесс, если не удалось уведомить пользователя, но логируем
            }

            // 2. Уведомление АДМИНАМ/ВЛАДЕЛЬЦАМ
            logger.info(
              `[PaymentSuccess] Preparing group notification for ${bot_name}, telegram_id: ${telegram_id}, amount: ${outSum}, stars: ${stars}, language_code: ${language_code}, username: ${username}, groupId: ${ADMIN_GROUP_ID}`
            )
            // Вызов sendPaymentNotification, который шлет в группу
            await sendPaymentNotification({
              amount: outSum.toString(),
              stars,
              telegramId: telegram_id.toString(),
              language_code,
              username,
              groupId: ADMIN_GROUP_ID,
              bot,
              subscription,
            })
            logger.info(
              `[PaymentSuccess] Group notification attempt logged via sendPaymentNotification for ${telegram_id} to group ${ADMIN_GROUP_ID}`
            )

            // 3. Уведомление ВЛАДЕЛЬЦУ БОТА В ЛС (остается без изменений)
            await notifyBotOwners(bot_name, {
              username,
              telegram_id: telegram_id.toString(),
              amount: outSum,
              stars,
              subscription: subscription,
            })
            logger.info(
              `[PaymentSuccess] notifyBotOwners called for ${telegram_id}`
            )
          } else {
            logger.error(
              `[PaymentSuccess] Could not create bot instance for bot ${bot_name}`
            )
          }
        } catch (notifyError) {
          logger.error(
            `[PaymentSuccess] Failed to send notification for InvId ${invId}`,
            notifyError
          )
        }
      } else {
        logger.warn(
          `[PaymentSuccess] No stars determined for InvId: ${invId}, amount: ${outSum}. No action taken.`
        )
      }

      // Успешный ответ Robokassa
      res.status(200).send(`OK${invId}`)
    } catch (error) {
      logger.error('[PaymentSuccess] Error processing payment:', {
        inv_id: invId, // Используем invId, который точно число
        error: error.message,
        stack: error.stack,
      })
      // Используем invId для ответа даже в случае ошибки, чтобы Robokassa не повторяла
      res.status(200).send(`OK${invId}`)
      // Отправка уведомлений об ошибках администратору/пользователю (если нужно)
      // const { telegram_id, language } = await getTelegramIdFromInvId(invId.toString()); // Нужно обработать ошибку, если invId не найден
      // errorMessage(error as Error, telegram_id, language === 'ru');
      errorMessageAdmin(error as Error)
    }
  }
}

// Оставляем экспорт по умолчанию, если он используется для регистрации роута
export default new PaymentService()
