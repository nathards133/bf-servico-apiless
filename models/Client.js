class Client {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.phone = data.phone;
    this.address = {
      street: data.address?.street || '',
      number: data.address?.number || '',
      complement: data.address?.complement || '',
      district: data.address?.district || '',
      city: data.address?.city || '',
      state: data.address?.state || '',
      zipCode: data.address?.zipCode || ''
    };
    this.document = data.document;
    this.user_id = data.user_id;
    this.active = data.active;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static fromDB(data) {
    return new Client(data);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      phone: this.phone,
      address: this.address,
      document: this.document,
      user_id: this.user_id,
      active: this.active,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

export default Client; 