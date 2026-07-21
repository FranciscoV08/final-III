import express from 'express';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';

import usersRouter from './routes/users.router.js';
import petsRouter from './routes/pets.router.js';
import adoptionsRouter from './routes/adoption.router.js';
import sessionsRouter from './routes/sessions.router.js';
import dotenv from 'dotenv'
import swaggerUi from 'swagger-ui-express';
import {swaggerSpec} from './swagger.js';

dotenv.config()
console.log('MONGO:', process.env.MONGO);
const app = express();
const PORT = process.env.PORT||8080;
mongoose.connect(process.env.MONGO)
.then(() => {
        console.log('Conectado a MongoDB');
})
.catch((error) => {
        console.error('Error al conectar a MongoDB:', error);
});

app.use(express.json());
app.use(cookieParser());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/users',usersRouter);
app.use('/api/pets',petsRouter);
app.use('/api/adoptions',adoptionsRouter);
app.use('/api/sessions',sessionsRouter);

app.listen(PORT,()=>console.log(`Listening on ${PORT}`))
