import { config } from 'dotenv'
config()

export const ApiKeyConfig = {
  API_KEY: process.env.API_KEY || '',
}

if (!ApiKeyConfig.API_KEY) {
  throw new Error('Missing API_KEY in environment variables')
}
