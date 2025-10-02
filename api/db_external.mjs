import { Pool } from 'pg';
const pool = new Pool({
    user: 'postgres',
    password: '1234',
    host: 'localhost', // name of the postgres service in docker-compose.yaml
    port: 5432, // default Postgres port
    database: 'movies_db'
});
export const blog_query = (text, params) => pool.query(text, params)
