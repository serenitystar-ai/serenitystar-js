export class EventEmitter<T extends Record<string, (...args: any[]) => void>> {
    private listeners: { [K in keyof T]?: Array<T[K]> } = {};

    on<K extends keyof T>(eventName: K, listener: T[K]): this {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName]!.push(listener);
        return this;
    }

    emit<K extends keyof T>(eventName: K, ...args: Parameters<T[K]>): void {
        this.listeners[eventName]?.forEach((listener) => listener(...args));
    }
}