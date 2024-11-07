import express from 'express';
import { auth } from '../middleware/auth.js';
import supabase from '../config/supabase.js';

const router = express.Router();

// Funções auxiliares
const formatSupplier = (data) => {
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    cnpj: data.cnpj,
    email: data.email,
    phone: data.phone,
    address: {
      street: data.address.street,
      number: data.address.number,
      complement: data.address.complement || '',
      city: data.address.city,
      state: data.address.state,
      zipCode: data.address.zipCode
    },
    suppliedProducts: data.supplied_products || [],
    userId: data.user_id,
    active: data.active,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    products: data.products
  };
};

// Rotas
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'name',
      sortOrder = 'asc',
      filterCity = '',
      search = ''
    } = req.query;

    const offset = (page - 1) * limit;

    const { data: suppliers, error, count } = await supabase
      .rpc('search_suppliers', {
        p_user_id: req.user.id,
        p_search: search || null,
        p_city: filterCity || null,
        p_sort_by: sortBy,
        p_sort_order: sortOrder,
        p_limit: limit,
        p_offset: offset
      });

    if (error) throw error;

    res.json({
      suppliers: suppliers.map(formatSupplier),
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit),
      totalItems: count
    });
  } catch (error) {
    console.error('Erro ao listar fornecedores:', error);
    res.status(500).json({ message: 'Erro ao listar fornecedores' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const supplierData = {
      name: req.body.name,
      cnpj: req.body.cnpj,
      email: req.body.email,
      phone: req.body.phone,
      address: {
        street: req.body.address.street,
        number: req.body.address.number,
        complement: req.body.address.complement || '',
        city: req.body.address.city,
        state: req.body.address.state,
        zipCode: req.body.address.zipCode
      },
      supplied_products: req.body.suppliedProducts || [],
      user_id: req.user.id,
      active: true
    };

    const { data: newSupplier, error } = await supabase
      .from('suppliers')
      .insert(supplierData)
      .select('*')
      .single();

    if (error) throw error;
    res.status(201).json(formatSupplier(newSupplier));
  } catch (error) {
    console.error('Erro ao criar fornecedor:', error);
    res.status(400).json({ message: error.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const supplierData = {
      name: req.body.name,
      cnpj: req.body.cnpj,
      email: req.body.email,
      phone: req.body.phone,
      address: {
        street: req.body.address.street,
        number: req.body.address.number,
        complement: req.body.address.complement || '',
        city: req.body.address.city,
        state: req.body.address.state,
        zipCode: req.body.address.zipCode
      },
      supplied_products: req.body.suppliedProducts || [],
      updated_at: new Date().toISOString()
    };

    const { data: updatedSupplier, error } = await supabase
      .from('suppliers')
      .update(supplierData)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(formatSupplier(updatedSupplier));
  } catch (error) {
    console.error('Erro ao atualizar fornecedor:', error);
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('suppliers')
      .update({ active: false })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ message: 'Fornecedor removido com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar fornecedor:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
