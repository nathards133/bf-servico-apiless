import express from 'express';
import { auth } from '../middleware/auth.js';
import supabase from '../config/supabase.js';

const router = express.Router();

// Funções auxiliares
const formatClient = (data) => {
  if (!data) return null;
  
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    address: data.address || {},
    document: data.document,
    userId: data.user_id,
    active: data.active,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
};

// Rotas
router.post('/', auth, async (req, res) => {
  try {
    const clientData = {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      address: req.body.address || {},
      document: req.body.document,
      user_id: req.user.id,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newClient, error } = await supabase
      .from('clients')
      .insert(clientData)
      .select('*')
      .single();

    if (error) throw error;
    res.status(201).json(formatClient(newClient));
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ 
      message: 'Error creating client',
      error: error.message
    });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { data: clients, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('active', true);

    if (error) throw error;
    res.json(clients.map(formatClient));
  } catch (error) {
    console.error('Error listing clients:', error);
    res.status(500).json({ message: 'Error listing clients' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error) throw error;
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }
    res.json(formatClient(client));
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({ message: 'Error fetching client' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { data: updatedClient, error } = await supabase
      .from('clients')
      .update({
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        address: req.body.address,
        document: req.body.document,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(formatClient(updatedClient));
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ message: 'Error updating client' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('clients')
      .update({ 
        active: false, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ message: 'Error deleting client' });
  }
});

router.get('/:clientId/service-history', auth, async (req, res) => {
  try {
    const { clientId } = req.params;
    
    const { data: serviceOrders, error } = await supabase
      .from('service_orders')
      .select(`
        id,
        status,
        total_value,
        created_at,
        updated_at,
        tasks (
          id,
          description,
          status,
          priority,
          due_date,
          completed_at,
          assigned_to,
          notes
        )
      `)
      .eq('client_id', clientId)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedServiceOrders = serviceOrders.map(order => ({
      id: order.id,
      status: order.status,
      totalValue: order.total_value,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      tasks: order.tasks?.map(task => ({
        id: task.id,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.due_date,
        completedAt: task.completed_at,
        assignedTo: task.assigned_to,
        notes: task.notes
      })) || []
    }));

    const stats = {
      totalOrders: formattedServiceOrders.length,
      totalValue: formattedServiceOrders.reduce((acc, order) => acc + Number(order.totalValue), 0),
      ordersByStatus: formattedServiceOrders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {})
    };

    res.json({
      orders: formattedServiceOrders,
      stats
    });
  } catch (error) {
    console.error('Erro ao buscar histórico de serviços:', error);
    res.status(500).json({ 
      message: 'Erro ao buscar histórico de serviços',
      error: error.message 
    });
  }
});

export default router; 