class Order {
  constructor(data) {
    this.id = data.id;
    this.client_id = data.client_id;
    this.user_id = data.user_id;
    this.service_id = data.service_id;
    this.service_type_id = data.service_type_id;
    this.service_attributes = data.service_attributes || [];
    this.expected_completion_date = data.expected_completion_date;
    this.order_source = data.order_source;
    this.description = data.description;
    this.total_value = data.total_value || 0;
    this.payment_status = data.payment_status;
    this.payment_method = data.payment_method;
    this.art_approval_status = data.art_approval_status;
    this.art_observations = data.art_observations;
    this.art_file_url = data.art_file_url;
    this.delivery_type = data.delivery_type;
    this.delivery_address = data.delivery_address;
    this.internal_notes = data.internal_notes;
    this.discount_value = data.discount_value || 0;
    this.status = data.status;
    this.active = data.active;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.items = data.items || [];
    this.history = data.history || [];
  }

  static fromDB(data) {
    return new Order(data);
  }

  toJSON() {
    return {
      id: this.id,
      client_id: this.client_id,
      user_id: this.user_id,
      service_id: this.service_id,
      service_type_id: this.service_type_id,
      service_attributes: this.service_attributes,
      expected_completion_date: this.expected_completion_date,
      order_source: this.order_source,
      description: this.description,
      total_value: this.total_value,
      payment_status: this.payment_status,
      payment_method: this.payment_method,
      art_approval_status: this.art_approval_status,
      art_observations: this.art_observations,
      art_file_url: this.art_file_url,
      delivery_type: this.delivery_type,
      delivery_address: this.delivery_address,
      internal_notes: this.internal_notes,
      discount_value: this.discount_value,
      status: this.status,
      active: this.active,
      created_at: this.created_at,
      updated_at: this.updated_at,
      items: this.items,
      history: this.history
    };
  }
}

export default Order; 