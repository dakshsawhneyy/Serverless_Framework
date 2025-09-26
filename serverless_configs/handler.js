const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require('uuid');

const lambdaClient = new LambdaClient();
const client = new DynamoDBClient();
const dynamo = DynamoDBDocumentClient.from(client);

// --- Service A ---
module.exports.serviceA = async(event) => {
    console.log('Service A was called');

    const params = {
        FunctionName: process.env.SERVICE_B_NAME,           // Name of lambda fxn you want to call
        InvocationType: 'RequestResponse',   // Make sync call just like an api. Wait for the result to come
        Payload: new TextEncoder().encode(JSON.stringify({ message: 'Hello from Service A!' })),    // to trigger another lambda funciton, we need to send a message
    }

    try {
        const command = new InvokeCommand(params);

        // Makes a netwrk call to AWS to trigger service_b lambda function
        const response = await lambdaClient.send(command)

        // The payload is a Uint8Array, so we need to decode it -- this is response we got while calling Service B
        const responsePayload = new TextDecoder().decode(response.Payload);

        return { statusCode: 200, body: JSON.stringify({ message: 'Service A successfully called Service B', responseFromB: JSON.parse(responsePayload) }) }
    } catch (error) {
        console.log(error.message);
        return { statusCode: 500, body: JSON.stringify({ message: 'Error calling Service B', error: error.message }) }
    }
}

// --- Service B --- This service writes an item to DynamoDB
module.exports.serviceB = async(event) => {
    console.log('Service B is called with payload: ', event)

    const params = {
        TableName: process.env.DYNAMODB_TABLE,
        Item: {
            id: uuidv4(),
            message: "Data created by service B",
            createdAt: new Date().getTime()
        }
    }

    try {
        // Send data into dynamodb table
        await dynamo.send(new PutCommand(params))
        return { statusCode: 200, body: JSON.stringify({ message: 'Data successfully written to dynamodb' }) }
    } catch (error) {
        console.log('Error writing to DynamoDB' ,error.message);
        return { statusCode: 500, body: JSON.stringify({ message: 'Error calling Service B', error: error.message }) }
    }
}
