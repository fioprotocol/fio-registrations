
import Server from '../api/server-api'
import FioClient from '../api/fio-client'

export const server = new Server()

async function chainEndpoint() {
  const {chainEndpoint} = await server.get('/public-api/info')
  return chainEndpoint
}

export const fio = new FioClient(chainEndpoint)
