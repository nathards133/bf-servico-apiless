class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.role = data.role || 'user';
    this.company = {
      name: data.company?.name || '',
      cnpj: data.company?.cnpj || '',
      phone: data.company?.phone || '',
      address: {
        street: data.company?.address?.street || '',
        number: data.company?.address?.number || '',
        complement: data.company?.address?.complement || '',
        district: data.company?.address?.district || '',
        city: data.company?.address?.city || '',
        state: data.company?.address?.state || '',
        zipCode: data.company?.address?.zipCode || ''
      }
    };
    this.business_type = data.business_type;
    this.has_certificate = data.has_certificate || false;
    this.certificate_expiration = data.certificate_expiration;
    this.nfe_config = {
      ambiente: data.nfe_config?.ambiente || 'homologacao',
      serie: data.nfe_config?.serie || '1',
      numero_inicial: data.nfe_config?.numero_inicial || 1
    };
    this.active = data.active;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static fromDB(data) {
    return new User(data);
  }

  toJSON() {
    return {
      id: this.id,
      email: this.email,
      role: this.role,
      company: this.company,
      business_type: this.business_type,
      has_certificate: this.has_certificate,
      certificate_expiration: this.certificate_expiration,
      nfe_config: this.nfe_config,
      active: this.active,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

export default User;