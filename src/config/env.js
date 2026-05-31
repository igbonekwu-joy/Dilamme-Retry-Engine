import dotenv from 'dotenv';

dotenv.config();

const env = {
    PORT: process.env.PORT,
    MOCK_SERVER_PORT: process.env.MOCK_SERVER_PORT,
}

export default env;