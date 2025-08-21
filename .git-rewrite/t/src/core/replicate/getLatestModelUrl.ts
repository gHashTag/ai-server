export async function getLatestModelUrl(modelName: string): Promise<string> {
  const response = await fetch(
    `https://api.replicate.com/v1/models/ghashtag/${modelName}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  )

  if (!response.ok) {
    throw new Error('Failed to fetch latest version id')
  }

  const data = await response.json()
  return `ghashtag/${modelName}:${data.latest_version.id}`
}
