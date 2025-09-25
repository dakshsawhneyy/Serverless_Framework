import express from 'express'
import morgan from 'morgan'
import promClient from 'prom-client';

const app = express();

const PORT = 9001;

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


app.get('/hello', (req,res) => {
    res.status(200).json({message: 'Hello from Service B - Daksh Sawhney'});
})

// Sending personalized metrics to /metrics
app.get('/metrics', async(req,res) => {
    res.set('Content-Type', promClient.register.contentType);
    const metrics = await promClient.register.metrics();
    res.end(metrics);
})

app.listen(PORT, () => {
    console.log(`Service B is running on port: ${PORT}`);
})
