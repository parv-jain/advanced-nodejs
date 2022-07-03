const events = require('events');
const { Kafka, CompressionTypes } = require('kafkajs');
const { isEmpty } = require('lodash');
const Q = require('q');

class KafkaClient {
    constructor () {
        this.kafkaConfig = {
            clientId: 'test-client',
            brokers: ['localhost:9092'],
            connectionTimeout: 3000,
            requestTimeout: 25000,
            retry: {
                initialRetryTime: 100,
                retries: 5,
                maxRetryTime: 30000,
                factor: 0.2,
                multiplier: 2,
            },
        };

        this.kafkaConnection = new Kafka(this.kafkaConfig);
    }
}

class KafkaProducer extends KafkaClient {
    constructor () {
        super();
        this.producerConfig = {
            createPartitioner: undefined, // custom partitioner
            retry: {
                initialRetryTime: 100,
                retries: 5,
                maxRetryTime: 30000,
                factor: 0.2,
                multiplier: 2,
            },
            metadataMaxAge: 300000, // The period of time in milliseconds after which we force a refresh of metadata even if we haven't seen any partition leadership changes to proactively discover any new brokers or partitions
            allowAutoTopicCreation: true, // Allow topic creation when querying metadata for non-existent topics
            transactionTimeout: 60000, // The maximum amount of time in ms that the transaction coordinator will wait for a transaction status update from the producer before proactively aborting the ongoing transaction. If this value is larger than the transaction.max.timeout.ms setting in the broker, the request will fail with a InvalidTransactionTimeout error
            idempotent: false, // Experimental. If enabled producer will ensure each message is written exactly once. Acks must be set to -1 ("all"). Retries will default to MAX_SAFE_INTEGER.
            maxInFlightRequests: undefined, // Max number of requests that may be in progress at any time. If falsey then no limit.    
        };
        this.producer = null;
        this.producerDeferred = null;
    }

    getProducer() {
        const deferred = Q.defer();

        if (this.producer) {
            deferred.resolve(this.producer);
        } else if (
            this.producerDeferred
            && this.producerDeferred.promise.inspect().state === 'pending'
        ) {
            return this.producerDeferred.promise;
        } else {
            this.producerDeferred = deferred;
            const producer = this.kafkaConnection.producer(this.producerConfig);
            producer
                .connect()
                .then(() => {
                    this.producer = producer;
                    this.producerDeferred?.resolve(this.producer);
                    deferred.resolve(this.producer);
                })
                .catch((error) => {
                    this.producerDeferred?.reject(error);
                    deferred.reject(error);
                });
        }

        return deferred.promise;
    }

    pushToTopic(
        topic,
        messages = [],
        acks = -1, // todo confirm
        timeout = 3000,
        compression = CompressionTypes.None,
    ) {
        if (!topic || isEmpty(messages)) {
            throw new Error('[KafkaProducer PushToTopic] Empty message/topic received.');
        }
        return this.getProducer()
            .then(() =>
                this.producer?.send({
                    topic: topic,
                    messages: messages,
                    acks: acks,
                    timeout: timeout,
                    compression: compression,
                }),
            )
            .catch((err) => {
                this.logger.error(err, '[KafkaProducer PushToTopic] Could not send message');
            });
    }
}

const kafkaProducerInstance = new KafkaProducer();

const processMessage = (dataString) => {
    try {
        data = JSON.parse(dataString);
        const messages = [
            {
                key: data.key.toString(),
                value: data.value.toString(),
            }
        ];
        const interval =  Math.floor(Math.random() * 10) + 1;
        return Q.delay(interval)
            .then(() => {
                return kafkaProducerInstance.pushToTopic('test-topic', messages, 1);            
            });
    } catch (err) {
        console.log(err, 'Error in process message');
    }
}

const eventEmitterInstance = new events.EventEmitter();

eventEmitterInstance.addListener('data', processMessage);

const emitEvent = (sequence) => {
    const data = {
        key: 0,
        value: sequence,
    }
    return eventEmitterInstance.emit('data', JSON.stringify(data));
}

const limit = 102000;

const sequenceList = Array(limit).fill().map((e, i) => i + 1)

sequenceList.reduce((previousPromise, sequence) => {
    return previousPromise.then(() => {
        // return Q.delay(100)
            // .then(() => {
                return emitEvent(sequence);
            // });
    });
}, Q())