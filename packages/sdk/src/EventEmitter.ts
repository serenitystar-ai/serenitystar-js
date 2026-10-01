export class EventEmitter<T extends Record<string, (...args: any[]) => void>> {
    private listeners: { [K in keyof T]?: Array<T[K]> } = {};

    on<K extends keyof T>(eventName: K, listener: T[K]): this {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName]!.push(listener);
        return this;
    }

    /**
     * Removes a listener added with {@link on}. Without a listener, removes every listener of
     * that event; without arguments, removes every listener of every event.
     */
    off<K extends keyof T>(eventName?: K, listener?: T[K]): this {
        if (eventName === undefined) {
            this.listeners = {};
            return this;
        }
        if (listener === undefined) {
            delete this.listeners[eventName];
            return this;
        }
        const listeners = this.listeners[eventName];
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (index !== -1) listeners.splice(index, 1);
        }
        return this;
    }

    emit<K extends keyof T>(eventName: K, ...args: Parameters<T[K]>): void {
        // A copy, so a listener that removes itself doesn't skip the next one.
        this.listeners[eventName]?.slice().forEach((listener) => listener(...args));
    }
}
