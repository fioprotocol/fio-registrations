
import {chainEndpoint} from './config'
import Server from '../api/server-api'
import FioClient from '../api/fio-client'

export const fio = new FioClient(chainEndpoint)
export const server = new Server()
