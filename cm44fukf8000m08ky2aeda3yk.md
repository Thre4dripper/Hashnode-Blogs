---
title: "Notification Microservice using Kafka and FCM"
seoTitle: "Scalable Notification Microservice with Kafka and FCM in NodeJs"
seoDescription: "Learn how to design a scalable notification microservice using Kafka for message queuing and FCM for real-time notifications, all implemented in Node.js."
datePublished: Sat Nov 30 2024 17:20:24 GMT+0000 (Coordinated Universal Time)
cuid: cm44fukf8000m08ky2aeda3yk
slug: notification-microservice-using-kafka-and-fcm
cover: https://cdn.hashnode.com/res/hashnode/image/upload/v1717839880625/b4789677-89b7-4def-a4ac-411de36636ac.png
tags: nodejs, kafka, notifications, push-notifications, fcm, queues, zookeeper, emailnotification, kafka-topic

---

# Introduction

Notifications are a crucial part of any day-to-day application, including social media, finance, e-commerce, and many more. While they may seem simple, their underlying architecture is what makes them highly efficient. From chat applications and payment notifications to marketing alerts, notifications play a vital role in enhancing user experience and engagement.

One might think that receiving notifications is straightforward—just constantly ping the server and fetch any new notifications. However, this approach is highly inefficient, wasting resources and bandwidth. Such a method is impractical for large-scale applications. Instead, notifications require a constant socket connection as a background service. This service remains connected to the server, allowing the server to push notifications to the client as soon as they are generated.

While some providers like OneSignal and Firebase offer easy integration of notification services into applications, they come with hard limits. Although these limits are generous and can support a large number of users, they still exist. Imagine making a payment and not receiving a notification—that would be disastrous. This scenario can occur when the server is overwhelmed with notifications and cannot handle the load at a given time. Every server has resource constraints, so we need a solution that can manage high throughput and hold a large amount of data. This is where messaging queues, such as Apache Kafka, come into play.

In this blog, we will explore how to design and implement a notification microservice using Kafka and FCM in Node.js. We'll cover everything from setting up the development environment and understanding the key components to deploying and scaling the microservice. Let's dive in!

# What is Kafka and Why Should We Use It?

Before diving into Kafka, let’s first understand **messaging queues**. Messaging queues are like the classic FIFO (First In, First Out) queues we encounter in traditional programming. They are a crucial tool for **decoupling services**, especially when the sender (producer) and receiver (consumer) have varying speeds, efficiency, or throughput. In such scenarios, messaging queues act as an asynchronous bridge. Producers can push messages into the queue at their pace, while consumers can process them independently, at their own speed.

*~ Back to Kafka*

Kafka is a **distributed messaging system** designed for **high throughput and scalability**, capable of handling massive volumes of data effortlessly. Unlike traditional systems, Kafka is built for modern, large-scale applications. It ensures that critical messages are delivered promptly, even during peak loads, making it an ideal choice for notification systems and beyond.

But Kafka is not just limited to notifications. Its true strength lies in its ability to handle enormous throughput—processing trillions of messages with ease. Kafka serves as a buffer between producers and consumers, **holding messages temporarily** when downstream systems are overloaded. This allows servers to process data at their capacity while maintaining system efficiency and reliability.

### Why Kafka Over Other Messaging Queues?

There are several messaging queue options available, such as RabbitMQ, BullMQ, and AWS SQS. So why choose Kafka? Let’s break it down:

#### **1\. RabbitMQ**

* RabbitMQ is a good alternative to Kafka for specific use cases.
    
* **Limitations:**
    
    * Consumers in RabbitMQ are socket-based, meaning **multiple consumers cannot consume the same message** simultaneously.
        
    * It’s better suited for tasks where immediate delivery and processing are required, but not for high-throughput, multi-consumer scenarios like Kafka excels in.
        

#### **2\. BullMQ**

* BullMQ is not a standalone queue but a **library built on top of Redis** to simulate queue-like behavior.
    
* **Limitations:**
    
    * Its performance is tied to Redis, which may not scale as well as Kafka for massive workloads.
        
    * Redis-based solutions work well for specific cases but lack Kafka's robust distributed nature.
        

#### **3\. AWS SQS**

* Amazon Simple Queue Service (SQS) is highly scalable and a solid contender for cloud-native applications.
    
* **Limitations:**
    
    * It’s a **vendor-dependent service**, locking you into AWS’s ecosystem.
        
    * SQS does not support Kafka’s **consumer group model**—a powerful feature for distributing messages among different types of consumers (e.g., notifications for emails, SMS, and push notifications). Instead, achieving similar functionality often requires combining multiple AWS services.
        

### The Kafka Advantage

Kafka’s **consumer group model** sets it apart. Here’s how it works:

* A **consumer group** is a logical grouping of consumers. Each consumer group can receive a copy of the same message, enabling flexible processing for different use cases.
    
    * For instance, a Kafka topic for notifications could have separate consumer groups for **push notifications**, **emails**, and **SMS**.
        
* Within a consumer group, only **one consumer processes a given message**, ensuring no duplication of effort.
    
* Kafka’s distributed nature allows you to **scale consumer groups independently**, making it a highly scalable and efficient messaging system.
    

By leveraging these features, Kafka can seamlessly handle diverse, large-scale workloads while maintaining reliability, speed, and scalability.

# FCM Overview

Firebase Cloud Messaging (FCM) is a powerful service provided by Firebase for delivering messages to client devices. It acts as the **actual server** that pushes notifications to devices, whether they’re Android, iOS, or web-based. While there are alternatives like **OneSignal** and **Twilio**, FCM stands out for its **ease of integration**, **robust features**, and the added bonus of being **free to use** (within generous limits).

### How FCM Works

FCM establishes a **persistent connection** between the server and client-side applications. This connection operates in the background, ensuring seamless delivery of notifications without constant polling or additional overhead. When a message is ready, FCM pushes it directly to the client device, making it incredibly efficient for real-time communication.

While FCM is highly efficient and supports high message rates, it has **limits** in terms of throughput. For small-scale applications, these limits are rarely a concern. However, in large-scale systems where notifications spike (e.g., flash sales, payment alerts), FCM alone may not suffice.

This is where **messaging queues** like Kafka come in:

* They act as a buffer between your application and FCM.
    
* Kafka handles a **high volume of messages** from your application and feeds them to FCM at a manageable rate.
    
* This integration ensures **scalability**, allowing you to handle spikes without dropping notifications or overwhelming the FCM servers.
    

# Hands-On

Enough theory—let’s get our hands dirty with code! We’ll build a **notification microservice** using **Kafka** as a message broker and **Firebase Cloud Messaging (FCM)** for sending push notifications. Additionally, we’ll use **Nodemailer** to send emails, demonstrating how multiple consumers can handle different tasks efficiently.

### Architecture Overview

We’ll create two separate **Node.js servers**:

1. **Producer**: The backend application that generates messages (e.g., API requests, user actions) and pushes them to Kafka.
    
2. **Consumer**: A worker application that listens to Kafka messages, processes them, and sends notifications (push notifications, emails, SMS, etc.).
    

This design ensures the producer focuses on generating messages, while the consumer handles delivery tasks, making the system scalable and decoupled.

### Step 1: Setting Up the Producer

#### 1\. Initialize the Project

```bash
mkdir kafka-producer && cd kafka-producer
npm init -y
npm i express kafkajs
```

#### 2\. Create the Producer Logic (`producer.js`)

```javascript
const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "kafka-producer",
  brokers: ["localhost:9092"], // Replace with your Kafka broker addresses
});

const producer = kafka.producer();

const produceMessage = async () => {
  await producer.connect();

  const message = {
    key: "key1",
    value: "Message triggered by API call",
  };

  await producer.send({
    topic: "test-topic",
    messages: [message],
  });

  console.log("Produced message:", message);

  await producer.disconnect();
};

module.exports = { produceMessage };
```

> **Note**: Kafka topics act like message channels. A single Kafka instance can manage multiple topics, enabling the system to route messages based on their type.

#### 3\. Create the Producer Server (`app.js`)

```javascript
const express = require("express");
const { produceMessage } = require("./producer");

const app = express();

app.get("/", (req, res) => {
  res.send("Hello from Kafka Producer!");
});

app.get("/produce", async (req, res) => {
  await produceMessage();
  res.send("Message produced successfully.");
});

app.listen(3000, () => {
  console.log("Producer server is running on port 3000");
});
```

Run the producer server:

```bash
node app.js
```

### Step 2: Setting Up the Consumer

#### 1\. Initialize the Project

```bash
mkdir kafka-consumer && cd kafka-consumer
npm init -y
npm i kafkajs firebase-admin nodemailer
```

#### 2\. Configure Firebase and Email (`consumer.js`)

```javascript
const { Kafka } = require("kafkajs");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.applicationDefault(), // Replace with your Firebase credentials
});

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "your-email@gmail.com", // Replace with your email
    pass: "your-email-password", // Replace with your email password
  },
});

const kafka = new Kafka({
  clientId: "kafka-consumer",
  brokers: ["localhost:9092"], // Replace with your Kafka broker addresses
});

const consumer = kafka.consumer({ groupId: "test-group" });

const consumeMessages = async () => {
  await consumer.connect();
  console.log("Consumer connected to Kafka");

  await consumer.subscribe({ topic: "test-topic", fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const value = message.value.toString();
      console.log("Consumed message:", value);

      // Push notification via FCM
      const fcmMessage = {
        notification: {
          title: "New Message",
          body: value,
        },
        token: "recipient-device-token", // Replace with an actual device token
      };

      try {
        const response = await admin.messaging().send(fcmMessage);
        console.log("Successfully sent FCM notification:", response);
      } catch (error) {
        console.error("Error sending FCM notification:", error);
      }

      // Email notification via Nodemailer
      const mailOptions = {
        from: "your-email@gmail.com",
        to: "recipient-email@gmail.com", // Replace with the recipient's email
        subject: "Kafka Notification",
        text: value,
      };

      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.error("Error sending email:", err);
        } else {
          console.log("Email sent successfully:", info.response);
        }
      });
    },
  });
};

module.exports = { consumeMessages };
```

#### 3\. Run the Consumer

Create a script (`index.js`) to start the consumer:

```javascript
const { consumeMessages } = require("./consumer");

consumeMessages().catch(console.error);
```

Run the consumer:

```bash
node index.js
```

### Key Features of the Architecture

1. **Multiple Consumer Groups**  
    Kafka allows different consumer groups to read the same topic independently. For example:
    
    * One group sends push notifications.
        
    * Another group sends emails.
        
    * Yet another handles SMS notifications.
        
2. **Scalability**  
    Kafka’s partitioning mechanism ensures that each consumer in a group processes only a subset of messages, allowing you to scale horizontally.
    
3. **Decoupling**  
    Producers and consumers operate independently. Producers are unaware of consumer logic, enabling flexibility and modular design.
    

### Testing the Microservice

Running Kafka directly on your machine can be a bit tricky due to its dependencies, such as Zookeeper. To simplify the setup, we can use Docker Compose. Below is the Docker Compose configuration for setting up Kafka and Zookeeper.

#### Docker Compose File (`docker-compose.yml`)

```yaml
version: "2"

services:
  zookeeper:
    image: wurstmeister/zookeeper:latest
    ports:
      - "2181:2181" # Zookeeper's default port

  kafka:
    image: wurstmeister/kafka:latest
    ports:
      - "9092:9092" # Kafka's external listener port
    expose:
      - "9093" # Kafka's internal listener port
    environment:
      KAFKA_ADVERTISED_LISTENERS: INSIDE://kafka:9093,OUTSIDE://localhost:9092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: INSIDE:PLAINTEXT,OUTSIDE:PLAINTEXT
      KAFKA_LISTENERS: INSIDE://0.0.0.0:9093,OUTSIDE://0.0.0.0:9092
      KAFKA_INTER_BROKER_LISTENER_NAME: INSIDE
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_CREATE_TOPICS: "test-topic:1:1" # Pre-create the topic 'test-topic' with 1 partition and replication factor 1
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock # Required for Kafka to communicate with the host network
```

### How to Use the Compose File

1. **Save the file**  
    Save the above configuration as `docker-compose.yml` in your project directory.
    
2. **Start the services**  
    Run the following command to start Kafka and Zookeeper:
    
    ```bash
    docker-compose up -d
    ```
    
3. Start the producer server:
    
    ```bash
    node app.js
    ```
    
4. Start the consumer server:
    
    ```bash
    node index.js
    ```
    
5. Trigger a message by visiting the producer endpoint:
    
    ```javascript
    http://localhost:3000/produce
    ```
    
6. Observe the consumer processing the message and sending notifications.
    

# Deployment

Kafka operates as a separate service from your producer and consumer servers and must be deployed independently. While Kafka can be installed on virtual machines, it's highly recommended to use **managed Kafka services** (e.g., AWS MSK, Confluent Cloud, or Azure Event Hubs). Managing a Kafka cluster yourself can be challenging due to the complexity of scaling, fault tolerance, and maintaining high availability.

#### Deploying Kafka

* **Managed Kafka Services**  
    Opting for managed services offloads the operational burden of maintaining Kafka clusters, including monitoring, scaling, and upgrades. These services ensure reliability and save time, allowing you to focus on application logic.
    
* **Self-Managed Kafka**  
    If you choose to deploy Kafka yourself, it can be installed on virtual machines or containerized using **Docker Compose** or **Kubernetes**. However, be prepared for added responsibilities like monitoring brokers, managing Zookeeper (if applicable), and handling failover scenarios.
    

#### Deploying Producers and Consumers

* **Flexibility in Deployment**  
    Producers and consumers can be deployed on:
    
    * The same virtual machine.
        
    * Separate virtual machines.
        
    * Docker containers or Kubernetes pods.
        
* **Load Balancing and Scaling**  
    Use **load balancers** to distribute traffic across multiple producer and consumer instances. Kafka's **consumer group** mechanism ensures that messages are evenly processed by available consumers, enabling horizontal scalability.
    
* **Environment Considerations**
    
    * Producers typically handle API logic and can scale to accommodate increased message traffic.
        
    * Consumers process messages and can scale based on message load and throughput requirements.
        

### Key Recommendations

* Use managed Kafka services to simplify operations and ensure high availability.
    
* Deploy producers and consumers as separate, scalable services, utilizing load balancers to handle traffic spikes.
    
* Ensure proper resource allocation for your Kafka service and consumers to maintain consistent performance under load.
    

# Conclusion

Notifications are an integral feature for modern applications, providing real-time updates and enhancing user engagement. While seemingly simple, their underlying architecture requires careful design to handle scale, reliability, and performance. Traditional approaches like polling are inefficient and unsustainable for large-scale systems. Instead, solutions like Apache Kafka, paired with Firebase Cloud Messaging (FCM), offer robust architectures that support high-throughput, real-time notification delivery.

Kafka's distributed nature, scalability, and consumer group model make it a standout choice for decoupling producer and consumer responsibilities. This architecture ensures that notifications are delivered efficiently, even during peak loads. FCM complements Kafka by seamlessly delivering push notifications to client devices.

The hands-on implementation of a notification microservice demonstrates how Kafka and FCM can work together to process and deliver notifications across multiple channels, such as push, email, and SMS. By leveraging Docker Compose, the setup becomes accessible for development and testing, while deployment considerations highlight the importance of managed Kafka services for reliability and ease of scaling.

In conclusion, building a notification microservice with Kafka and FCM not only meets the demands of high-scale systems but also ensures reliability, flexibility, and efficiency. By adopting this approach, developers can focus on creating user-centric experiences without being limited by infrastructure constraints. Whether for social media, e-commerce, or finance, this architecture provides a solid foundation for handling notifications in any large-scale application.