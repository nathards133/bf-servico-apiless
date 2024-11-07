class Service {
    constructor(data) {
        this.id = data.id;
        this.user_id = data.user_id;
        this.name = data.name;
        this.description = data.description;
        this.base_price = data.base_price || 0;
        this.attributes = data.attributes || [];
        this.active = data.active;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    static fromDB(data) {
        return new Service(data);
    }

    toJSON() {
        return {
            id: this.id,
            user_id: this.user_id,
            name: this.name,
            description: this.description,
            base_price: this.base_price,
            attributes: this.attributes,
            active: this.active,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

export default Service; 