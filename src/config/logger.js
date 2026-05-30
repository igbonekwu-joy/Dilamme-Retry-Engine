import winston from 'winston';

export default function () {
    process.on('uncaughtException', (ex) => {
        winston.error(ex.message, ex);
        process.exit(1); 
    });  

    process.on('unhandledRejection', (ex) => {
        winston.error(ex.message, ex);
        process.exit(1);
    }); 

    winston.add(new winston.transports.Console());

    if(process.env.NODE_ENV !== 'production') {
        winston.add(new winston.transports.File({ filename: 'logfile.log' })); 
    }
}