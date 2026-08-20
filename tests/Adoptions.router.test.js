/**
 * Tests funcionales para adoption.router.js
 * ------------------------------------------------------------
 * Stack: Mocha + Chai + Supertest + Mongoose
 * (stack estándar en proyectos backend tipo Coderhouse)
 *
 * SUPUESTOS A REVISAR / AJUSTAR según tu proyecto real:
 *  1. `app` se exporta desde '../src/app.js' (o donde tengas tu app de Express)
 *     configurada SIN levantar el server con app.listen (o exportando el server).
 *  2. Las rutas de adoption están montadas en '/api/adoptions'.
 *  3. Existen modelos Mongoose 'User', 'Pet' y 'Adoption' en:
 *       - '../src/dao/models/User.js'
 *       - '../src/dao/models/Pet.js'
 *       - '../src/dao/models/Adoption.js'
 *     Ajustá los imports/paths si tu estructura difiere.
 *  4. User tiene, como mínimo: first_name, last_name, email, password, pets: []
 *  5. Pet tiene, como mínimo: name, specie, birthDate (Date), adopted: Boolean, owner
 *  6. Adoption tiene: owner (ObjectId -> User), pet (ObjectId -> Pet)
 *  7. Se usa una base de datos de test separada (variable de entorno MONGO_URL_TEST
 *     o similar). Ajustá la conexión en el hook `before`.
 *
 * Contrato de la API verificado contra la documentación swagger del router:
 *  - GET    /api/adoptions            -> 200 { status: 'success', payload: [...] }
 *  - GET    /api/adoptions/:aid       -> 200 { status: 'success', payload: {...} }
 *                                      -> 404 { status: 'error', error: 'Adoption not found' }
 *  - POST   /api/adoptions/:uid/:pid  -> 200 { status: 'success', message: 'Pet adopted' }
 *                                      -> 404 { status: 'error', error: 'user Not found' }
 *                                      -> 404 { status: 'error', error: 'Pet not found' }
 *                                      -> 400 { status: 'error', error: 'Pet is already adopted' }
 */

import mongoose from 'mongoose';
import supertest from 'supertest';
import { expect } from 'chai';

import app from '../src/app.js';
import UserModel from '../src/dao/models/User.js';
import PetModel from '../src/dao/models/Pet.js';
import AdoptionModel from '../src/dao/models/Adoption.js';

const requester = supertest(app);
const BASE_PATH = '/api/adoptions';

const MOCK_USER = {
    first_name: 'Juan',
    last_name: 'Perez',
    email: 'juan.perez.test@example.com',
    password: 'coder123',
};

const MOCK_PET = {
    name: 'Firulais',
    specie: 'Dog',
    birthDate: new Date('2020-01-01'),
    adopted: false,
};

describe('Router de Adoptions - Tests funcionales', function () {
    this.timeout(10000);

    before(async () => {
        // Ajustar la URL de conexión a tu base de datos de test
        const MONGO_URL_TEST =
            process.env.MONGO_URL_TEST ||
            'mongodb://localhost:27017/adoptions_test_db';

        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(MONGO_URL_TEST);
        }
    });

    beforeEach(async () => {
        // Limpieza total antes de cada test para asegurar independencia entre casos
        await UserModel.deleteMany({});
        await PetModel.deleteMany({});
        await AdoptionModel.deleteMany({});
    });

    after(async () => {
        await UserModel.deleteMany({});
        await PetModel.deleteMany({});
        await AdoptionModel.deleteMany({});
        await mongoose.connection.close();
    });

    // ------------------------------------------------------------------
    // POST /api/adoptions/:uid/:pid
    // ------------------------------------------------------------------
    describe('POST /:uid/:pid (createAdoption)', () => {
        it('debe crear una adopción cuando el usuario y la mascota existen y la mascota no fue adoptada', async () => {
            const user = await UserModel.create(MOCK_USER);
            const pet = await PetModel.create(MOCK_PET);

            const { statusCode, body } = await requester.post(
                `${BASE_PATH}/${user._id}/${pet._id}`
            );

            expect(statusCode).to.equal(200);
            expect(body.status).to.equal('success');
            expect(body.message).to.equal('Pet adopted');

            // Efectos secundarios esperados en la base de datos
            const updatedPet = await PetModel.findById(pet._id);
            expect(updatedPet.adopted).to.equal(true);

            const updatedUser = await UserModel.findById(user._id);
            const userPetIds = updatedUser.pets.map((p) =>
                (p.id ?? p).toString()
            );
            expect(userPetIds).to.include(pet._id.toString());

            const adoption = await AdoptionModel.findOne({
                owner: user._id,
                pet: pet._id,
            });
            expect(adoption).to.exist;
        });

        it('debe responder 404 con "user Not found" si el usuario no existe', async () => {
            const pet = await PetModel.create(MOCK_PET);
            const fakeUserId = new mongoose.Types.ObjectId();

            const { statusCode, body } = await requester.post(
                `${BASE_PATH}/${fakeUserId}/${pet._id}`
            );

            expect(statusCode).to.equal(404);
            expect(body.status).to.equal('error');
            expect(body.error).to.equal('user Not found');
        });

        it('debe responder 404 con "Pet not found" si la mascota no existe', async () => {
            const user = await UserModel.create(MOCK_USER);
            const fakePetId = new mongoose.Types.ObjectId();

            const { statusCode, body } = await requester.post(
                `${BASE_PATH}/${user._id}/${fakePetId}`
            );

            expect(statusCode).to.equal(404);
            expect(body.status).to.equal('error');
            expect(body.error).to.equal('Pet not found');
        });

        it('debe responder 400 con "Pet is already adopted" si la mascota ya fue adoptada', async () => {
            const user = await UserModel.create(MOCK_USER);
            const pet = await PetModel.create({ ...MOCK_PET, adopted: true });

            const { statusCode, body } = await requester.post(
                `${BASE_PATH}/${user._id}/${pet._id}`
            );

            expect(statusCode).to.equal(400);
            expect(body.status).to.equal('error');
            expect(body.error).to.equal('Pet is already adopted');
        });

        it('no debe duplicar la adopción si se intenta adoptar dos veces la misma mascota', async () => {
            const user = await UserModel.create(MOCK_USER);
            const pet = await PetModel.create(MOCK_PET);

            await requester.post(`${BASE_PATH}/${user._id}/${pet._id}`); // primera adopción, éxito

            const { statusCode, body } = await requester.post(
                `${BASE_PATH}/${user._id}/${pet._id}`
            ); // segundo intento

            expect(statusCode).to.equal(400);
            expect(body.error).to.equal('Pet is already adopted');

            const adoptionsCount = await AdoptionModel.countDocuments({
                pet: pet._id,
            });
            expect(adoptionsCount).to.equal(1);
        });
    });

    // ------------------------------------------------------------------
    // GET /api/adoptions/:aid
    // ------------------------------------------------------------------
    describe('GET /:aid (getAdoption)', () => {
        it('debe devolver la adopción cuando el id existe', async () => {
            const user = await UserModel.create(MOCK_USER);
            const pet = await PetModel.create(MOCK_PET);
            const adoption = await AdoptionModel.create({
                owner: user._id,
                pet: pet._id,
            });

            const { statusCode, body } = await requester.get(
                `${BASE_PATH}/${adoption._id}`
            );

            expect(statusCode).to.equal(200);
            expect(body.status).to.equal('success');
            expect(body.payload).to.exist;
            expect(body.payload._id).to.equal(adoption._id.toString());
        });

        it('debe responder 404 con "Adoption not found" si el id no existe', async () => {
            const fakeAdoptionId = new mongoose.Types.ObjectId();

            const { statusCode, body } = await requester.get(
                `${BASE_PATH}/${fakeAdoptionId}`
            );

            expect(statusCode).to.equal(404);
            expect(body.status).to.equal('error');
            expect(body.error).to.equal('Adoption not found');
        });
    });

    // ------------------------------------------------------------------
    // GET /api/adoptions
    // ------------------------------------------------------------------
    describe('GET / (getAllAdoptions)', () => {
        it('debe devolver un array vacío cuando no hay adopciones', async () => {
            const { statusCode, body } = await requester.get(`${BASE_PATH}/`);

            expect(statusCode).to.equal(200);
            expect(body.status).to.equal('success');
            expect(body.payload).to.be.an('array').that.is.empty;
        });

        it('debe devolver todas las adopciones existentes', async () => {
            const user = await UserModel.create(MOCK_USER);
            const pet1 = await PetModel.create(MOCK_PET);
            const pet2 = await PetModel.create({ ...MOCK_PET, name: 'Michi' });

            await AdoptionModel.create({ owner: user._id, pet: pet1._id });
            await AdoptionModel.create({ owner: user._id, pet: pet2._id });

            const { statusCode, body } = await requester.get(`${BASE_PATH}/`);

            expect(statusCode).to.equal(200);
            expect(body.status).to.equal('success');
            expect(body.payload).to.be.an('array').with.lengthOf(2);
        });
    });
});