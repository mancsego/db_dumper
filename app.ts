import createError from 'http-errors'
import express, { Request, Response } from 'express'

import indexRouter from './src/routes/index'

const app = express()
const port = 3000

app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.use('/', indexRouter)

app.use((req, res, next) => {
  next(createError(404))
})

app.use(
  (error: Record<string, string | number>, req: Request, res: Response) => {
    res.status(+error.status)
    res.json(error)
  }
)

app.listen(port, () => {
  console.log(`Example app listening on http://localhost:${port}`)
})

export default app
