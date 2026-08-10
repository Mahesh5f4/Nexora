package com.EventmanagementbyMahesh.event.common;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.containers.RabbitMQContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public abstract class AbstractIntegrationTest {

    @Container
    protected static final MySQLContainer<?> mySQLContainer = new MySQLContainer<>("mysql:8.0.32")
            .withDatabaseName("eventhub_test")
            .withUsername("test")
            .withPassword("test");

    @Container
    protected static final GenericContainer<?> redisContainer = new GenericContainer<>(DockerImageName.parse("redis:7.0-alpine"))
            .withExposedPorts(6379);

    @Container
    protected static final RabbitMQContainer rabbitMQContainer = new RabbitMQContainer(DockerImageName.parse("rabbitmq:3.12-management-alpine"))
            .withExposedPorts(5672, 15672);

    @DynamicPropertySource
    static void registerProperties(DynamicPropertyRegistry registry) {
        // MySQL
        registry.add("spring.datasource.url", mySQLContainer::getJdbcUrl);
        registry.add("spring.datasource.username", mySQLContainer::getUsername);
        registry.add("spring.datasource.password", mySQLContainer::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "update");

        // Redis
        registry.add("spring.data.redis.host", redisContainer::getHost);
        registry.add("spring.data.redis.port", redisContainer::getFirstMappedPort);

        // RabbitMQ
        registry.add("spring.rabbitmq.host", rabbitMQContainer::getHost);
        registry.add("spring.rabbitmq.port", rabbitMQContainer::getAmqpPort);
        registry.add("spring.rabbitmq.username", rabbitMQContainer::getAdminUsername);
        registry.add("spring.rabbitmq.password", rabbitMQContainer::getAdminPassword);
    }
}
