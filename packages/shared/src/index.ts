/// <reference types="node" />
// Example shared utilities
export interface User {
    id: string;
    name: string;
    email: string;
}

export const greet = (name: string): string => {
    return `Hello, ${name}!`;
};

export const API_BASE_URL = (typeof process !== 'undefined' && process.env?.API_URL) || 'http://localhost:3000';