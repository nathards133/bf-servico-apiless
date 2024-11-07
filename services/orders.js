import express from 'express';
import { auth } from '../middleware/auth.js';
import supabase from '../config/supabase.js';

const router = express.Router();

// Criar nova OS
router.post('/', auth, async (req, res) => {
  try {
    const {
      clientId,
      serviceId,
      serviceAttributes,
      expectedCompletionDate,
      orderSource,
      description,
      deliveryType,
      deliveryAddress,
      paymentMethod,
      artObservations,
      artApprovalStatus,
      serviceValue,
      discount,
      internalNotes,
      artFile
    } = req.body;

    // Validar se o serviço pertence ao usuário
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('*')
      .eq('id', serviceId)
      .eq('user_id', req.user.id)
      .single();

    if (serviceError || !service) {
      return res.status(400).json({ message: 'Serviço inválido' });
    }

    // Preparar o objeto de endereço como JSONB
    const deliveryAddressJson = {
      cep: req.body.cep,
      address: req.body.deliveryAddress,
      number: req.body.deliveryNumber
    };

    // Inserir OS
    const { data: serviceOrder, error: orderError } = await supabase
      .from('service_orders')
      .insert({
        client_id: clientId,
        user_id: req.user.id,
        service_id: serviceId,
        service_type_id: service.service_type_id,
        service_attributes: serviceAttributes,
        expected_completion_date: expectedCompletionDate,
        order_source: orderSource,
        description,
        total_value: serviceValue || 0,
        payment_status: 'pending',
        payment_method: paymentMethod,
        art_approval_status: artApprovalStatus || 'pending',
        art_observations: artObservations,
        delivery_type: deliveryType,
        delivery_address: deliveryAddressJson,
        internal_notes: internalNotes,
        discount_value: discount || 0,
        status: 'pending',
        active: true
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Inserir itens da OS
    const serviceOrderItems = items.map(item => ({
      service_order_id: serviceOrder.id,
      print_type: item.printType,
      width: parseFloat(item.width) || 0,
      height: parseFloat(item.height) || 0,
      quantity: parseInt(item.quantity) || 1,
      material: item.material || '',
      finishing: Array.isArray(item.finishing) ? item.finishing : [],
      requires_installation: Boolean(item.requiresInstallation),
      unit_value: parseFloat(item.unitValue) || 0,
      total_value: (parseFloat(item.unitValue) || 0) * (parseInt(item.quantity) || 1),
      observations: item.observations || ''
    }));

    const { error: itemsError } = await supabase
      .from('service_order_items')
      .insert(serviceOrderItems);

    if (itemsError) throw itemsError;

    // Se houver arquivo de arte, fazer upload para o storage
    if (artFile && artFile.name) {
      const fileExt = artFile.name.split('.').pop();
      const fileName = `${serviceOrder.id}/art.${fileExt}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('service-orders')
        .upload(fileName, artFile);

      if (uploadError) throw uploadError;

      // Obter URL pública do arquivo
      const { data: { publicUrl } } = supabase.storage
        .from('service-orders')
        .getPublicUrl(fileName);

      // Atualizar OS com a URL do arquivo
      const { error: updateError } = await supabase
        .from('service_orders')
        .update({ art_file_url: publicUrl })
        .eq('id', serviceOrder.id);

      if (updateError) throw updateError;
    }

    // Registrar histórico inicial
    const { error: historyError } = await supabase
      .from('service_order_history')
      .insert({
        service_order_id: serviceOrder.id,
        user_id: req.user.id,
        status: 'pending',
        notes: 'Ordem de serviço criada'
      });

    if (historyError) throw historyError;

    res.status(201).json(serviceOrder);
  } catch (error) {
    console.error('Erro ao criar ordem de serviço:', error);
    res.status(500).json({ 
      message: 'Erro ao criar ordem de serviço',
      error: error.message 
    });
  }
});

// Listar OS com filtros e estatísticas
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, startDate, endDate } = req.query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Query base para contagem e estatísticas
    let baseQuery = supabase
      .from('service_orders')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id)
      .eq('active', true);

    // Aplicar filtros
    if (search) {
      baseQuery = baseQuery.or(`order_number.ilike.%${search}%,description.ilike.%${search}%`);
    }
    if (status) {
      baseQuery = baseQuery.eq('status', status);
    }
    if (startDate) {
      baseQuery = baseQuery.gte('created_at', startDate);
    }
    if (endDate) {
      baseQuery = baseQuery.lte('created_at', endDate);
    }

    // Query para estatísticas financeiras
    const { data: stats, error: statsError } = await supabase
      .from('service_orders')
      .select(`
        status,
        payment_status,
        total_value
      `)
      .eq('user_id', req.user.id)
      .eq('active', true);

    if (statsError) throw statsError;

    // Calcular estatísticas
    const statistics = {
      pending: stats.filter(order => order.status === 'pending').length,
      completed: stats.filter(order => order.status === 'completed').length,
      expectedRevenue: stats
        .filter(order => order.payment_status === 'pending')
        .reduce((acc, order) => acc + (order.total_value || 0), 0),
      actualRevenue: stats
        .filter(order => order.payment_status === 'completed')
        .reduce((acc, order) => acc + (order.total_value || 0), 0)
    };

    // Query para dados paginados
    const { data: orders, error: ordersError, count } = await baseQuery
      .select(`
        *,
        client:clients(*)
      `)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (ordersError) throw ordersError;

    res.json({
      orders,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit),
      stats: statistics
    });
  } catch (error) {
    console.error('Erro ao listar ordens de serviço:', error);
    res.status(500).json({ message: 'Erro ao listar ordens de serviço' });
  }
});

// Obter OS específica
router.get('/:id', auth, async (req, res) => {
  try {
    const { data: order, error } = await supabase
      .from('service_orders')
      .select(`
        *,
        client:clients(*),
        items:service_order_items(*),
        history:service_order_history(*)
      `)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error) throw error;
    if (!order) {
      return res.status(404).json({ message: 'Ordem de serviço não encontrada' });
    }

    res.json(order);
  } catch (error) {
    console.error('Erro ao buscar ordem de serviço:', error);
    res.status(500).json({ message: 'Erro ao buscar ordem de serviço' });
  }
});

// Atualizar status da OS
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status, notes } = req.body;

    // Atualizar status
    const { data: order, error: updateError } = await supabase
      .from('service_orders')
      .update({ status })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Registrar histórico
    const { error: historyError } = await supabase
      .from('service_order_history')
      .insert({
        service_order_id: req.params.id,
        user_id: req.user.id,
        status,
        notes
      });

    if (historyError) throw historyError;

    res.json(order);
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ message: 'Erro ao atualizar status' });
  }
});

// Deletar OS (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('service_orders')
      .update({ active: false })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;

    res.json({ message: 'Ordem de serviço removida com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar ordem de serviço:', error);
    res.status(500).json({ message: 'Erro ao deletar ordem de serviço' });
  }
});

export default router;