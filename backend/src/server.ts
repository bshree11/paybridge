import app from './app'
import { env } from './config/environment';
import { logger } from './utils/logger'

const PORT = env.PORT;

app.listen(PORT, () =>{
    logger.info(`Server running on post ${PORT}`);
    logger.info(`Environment: ${env.NODE_ENV}`);

    console.log(`http://localhost:${PORT}`)
});