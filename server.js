import app from './src/app.js';
import env from './src/config/env.js';

const PORT = env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});