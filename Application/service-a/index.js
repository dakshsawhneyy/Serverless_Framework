import express from 'express';
import promClient from 'prom-client';
import morgan from 'morgan';
import axios from 'axios';
import pino from 'pino'

const app = express();

const PORT = 9000;


// Creating logger and logging fxn using pino -- fluentbit can easily fetch these logs
const logger = pino();
const logging = () => {
    logger.info('Hello from Service A - Daksh Sawhney');
    logger.error('This is an error log from Service A - Daksh Sawhney');
    logger.warn('This is a warning log from Service A - Daksh Sawhney');
    logger.debug('This is a debug log from Service A - Daksh Sawhney');
    logger.fatal('This is a fatal log from Service A - Daksh Sawhney');
    logger.info("This is just for testing");
}


// Prometheus Metrics
const httpRequestCounter = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'path', 'status_code']
}) 
const httpRequestDuration = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'path', 'status_code'],
    buckets: [0.1, 0.5, 1, 2.5, 5, 10]      // Buckets for the histogram in seconds
})
const requestDurationSummary = new promClient.Summary({
    name: 'http_request_duration_summary_seconds',
    help: 'Summary of HTTP request durations in seconds',
    labelNames: ['method', 'path', 'status_code'],
    percentiles: [0.5, 0.9, 0.99]           // Percentiles to calculate
})


// Middleware for morgan
app.use(morgan('common'))   // logs everything and sends them as stdout

// Middleware to parse JSON requests and adding labels to metrics so it can track metrics
app.use((req,res,next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}s`);

        httpRequestCounter.labels( req.method, req.path, res.statusCode ).inc();
        httpRequestDuration.labels( req.method, req.path, res.statusCode ).observe(duration);
        requestDurationSummary.labels( req.method, req.path, res.statusCode ).observe(duration);
    })
    next();
})


// Handling Requests
app.get('/', (req,res) => {
    res.status(200).json({message: 'Hello from Service A ~dakshsawhneyyyyyyy'});
})

app.get('/healthy', (req, res) => {
    res.status(200).json({
        name: "👀 - Obserability 🔥- Daksh Sawhney",
        status: "healthy"
    })
});

app.get('/serverError', (req, res) => {
    res.status(500).json({
        error: " Internal server error",
        statusCode: 500
    })
});

app.get('/notFound', (req, res) => {
    res.status(404).json({
        error: "Not Found",
        statusCode: 404
    })
});

// Simulate a crash by throwing an error
app.get('/crash', (req, res) => {
    console.log('Intentionally crashing the server...');
    logger.fatal('Server is crashing now...');
    process.exit(1);
});

// Logging endpoint to generate different types of logs
app.get('/logs', (req,res) => {
    logging();
    res.status(200).json({objective: 'To Generate logs !!!', message: 'Logs generated! Check your logging system...'});
})


// Sending personalized metrics to /metrics
app.get('/metrics', async(req,res) => {
    res.set('Content-Type', promClient.register.contentType);
    const metrics = await promClient.register.metrics();
    res.end(metrics);
})

// Call service B
app.get('/call-service-b', async(req,res) => {
    try {
        const response = await axios.get(`${process.env.SERVICE_B_URI}/hello`);
        res.send(`<h1 style="font-size: 100px">Service B says: ${response.data.message}<h1>`);
    } catch (error) {
        res.status(500).json({error: 'Failed to call Service B'});
        console.error(error)
    }
})


app.listen(PORT, () => {
  console.log(`Service A is running on port:  ${PORT}`);
});
