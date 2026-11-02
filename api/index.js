import express from 'express'
import api from '../backend/src/server.js'

const server = express()

server.use((req, _res, next) => {
  const requestUrl = new URL(req.url, 'http://localhost')
  const route = requestUrl.searchParams.get('__route')

  if (route) {
    requestUrl.searchParams.delete('__route')
    const query = requestUrl.searchParams.toString()
    req.url = `/api/${route}${query ? `?${query}` : ''}`
  }

  next()
})

server.use(api)

export default server
