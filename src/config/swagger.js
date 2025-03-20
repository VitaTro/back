const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUI = require("swagger-ui-express");

const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "Simple Inventory API",
      version: "1.0.0",
      description: "API documentation for the Simple Inventory project",
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        GoldProduct: {
          type: "object",
          required: ["name", "category", "price"],
          properties: {
            name: {
              type: "string",
              description: "Назва продукту",
            },
            category: {
              type: "string",
              description: "Категорія продукту",
            },
            price: {
              type: "number",
              description: "Ціна продукту",
            },
            description: {
              type: "string",
              description: "Опис продукту",
            },
            photoUrl: {
              type: "string",
              description: "URL зображення продукту",
            },
            inStock: {
              type: "boolean",
              description: "Наявність на складі",
            },
            visible: {
              type: "boolean",
              description: "Видимість продукту",
            },
          },
        },
        SilverProduct: {
          type: "object",
          required: ["name", "category", "price"],
          properties: {
            name: {
              type: "string",
              description: "Назва продукту",
            },
            category: {
              type: "string",
              description: "Категорія продукту",
            },
            price: {
              type: "number",
              description: "Ціна продукту",
            },
            description: {
              type: "string",
              description: "Опис продукту",
            },
            photoUrl: {
              type: "string",
              description: "URL зображення продукту",
            },
            inStock: {
              type: "boolean",
              description: "Наявність на складі",
            },
            visible: {
              type: "boolean",
              description: "Видимість продукту",
            },
          },
        },
        SetProduct: {
          type: "object",
          required: ["name", "category", "price"],
          properties: {
            name: {
              type: "string",
              description: "Назва набору",
            },
            category: {
              type: "string",
              description: "Категорія набору",
            },
            price: {
              type: "number",
              description: "Ціна набору",
            },
            description: {
              type: "string",
              description: "Опис набору",
            },
            photoUrl: {
              type: "string",
              description: "URL зображення продукту",
            },
            inStock: {
              type: "boolean",
              description: "Наявність на складі",
            },
            visible: {
              type: "boolean",
              description: "Видимість набору",
            },
          },
        },
        BoxProduct: {
          type: "object",
          required: ["name", "category", "price"],
          properties: {
            name: {
              type: "string",
              description: "Назва коробки",
            },
            category: {
              type: "string",
              description: "Категорія коробки",
            },
            price: {
              type: "number",
              description: "Ціна коробки",
            },
            description: {
              type: "string",
              description: "Опис коробки",
            },
            photoUrl: {
              type: "string",
              description: "URL зображення продукту",
            },
            inStock: {
              type: "boolean",
              description: "Наявність на складі",
            },
            visible: {
              type: "boolean",
              description: "Видимість коробки",
            },
          },
        },
        Auth: {
          type: "object",
          required: ["username", "email", "password"],
          properties: {
            username: {
              type: "string",
              description: "Ім'я користувача",
            },
            email: {
              type: "string",
              description: "Електронна пошта користувача",
            },
            password: {
              type: "string",
              description: "Пароль користувача",
            },
            avatar: {
              type: "string",
              description: "URL або шлях до зображення аватара",
            },
            basket: {
              type: "array",
              items: {
                type: "string",
                description: "ID продуктів у кошику користувача",
              },
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Дата створення профілю",
            },
          },
        },
        UserProfile: {
          type: "object",
          properties: {
            username: {
              type: "string",
              description: "Ім'я користувача",
            },
            email: {
              type: "string",
              description: "Електронна пошта користувача",
            },
            avatar: {
              type: "string",
              description: "URL або шлях до зображення аватара",
            },
            basket: {
              type: "array",
              items: {
                type: "string",
                description: "ID продуктів у кошику користувача",
              },
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Дата створення профілю",
            },
          },
        },
        Subscriber: {
          type: "object",
          required: ["email"],
          properties: {
            email: {
              type: "string",
              description: "Електронна пошта підписника",
            },
          },
        },
      },
    },
  },
  apis: ["./src/routes/**/*.js"], // Вказуйте правильний шлях до файлів з маршрутами
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);

module.exports = { swaggerDocs };
