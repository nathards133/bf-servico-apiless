import express from 'express';
import { auth } from '../middleware/auth.js';
import supabase from '../config/supabase.js';

const router = express.Router();

// Buscar contas
router.get('/', auth, async (req, res) => {
  try {
    // Buscar contas a pagar normais
    const { data: accountsPayable, error: accountsError } = await supabase
      .from('accounts_payable')
      .select(`
        *,
        supplier:suppliers(name),
        product:products(name)
      `)
      .eq('user_id', req.user.id)
      .eq('is_installment', false);

    // Buscar contas recorrentes
    const { data: recurringAccounts, error: recurringError } = await supabase
      .from('recurring_accounts')
      .select('*')
      .eq('user_id', req.user.id);

    // Buscar parcelas
    const { data: installmentAccounts, error: installmentsError } = await supabase
      .from('accounts_payable')
      .select(`
        *,
        supplier:suppliers(name),
        product:products(name)
      `)
      .eq('user_id', req.user.id)
      .eq('is_installment', true);

    if (accountsError || recurringError || installmentsError) throw error;

    res.status(200).json({
      accountsPayable: accountsPayable || [],
      recurringAccounts: recurringAccounts || [],
      installmentAccounts: installmentAccounts || []
    });
  } catch (error) {
    console.error('Erro ao buscar contas:', error);
    res.status(500).json({ message: 'Erro ao buscar contas' });
  }
});

// Criar nova conta
router.post('/', auth, async (req, res) => {
  try {
    const { isRecurring, isInstallment, totalInstallments, ...accountData } = req.body;
    
    // Remover campos vazios
    Object.keys(accountData).forEach(key => 
      (accountData[key] === '' || accountData[key] === undefined) && delete accountData[key]
    );

    // Adicionar user_id
    accountData.user_id = req.user.id;

    if (isRecurring && isInstallment) {
      const installments = await createRecurringInstallmentAccount(accountData, totalInstallments, req.user.id);
      res.status(201).json(installments);
    } else if (isRecurring) {
      const { data, error } = await supabase
        .from('recurring_accounts')
        .insert(accountData)
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(data);
    } else if (isInstallment) {
      const installments = await createInstallmentAccount(accountData, totalInstallments, req.user.id);
      res.status(201).json(installments);
    } else {
      const { data, error } = await supabase
        .from('accounts_payable')
        .insert(accountData)
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(data);
    }
  } catch (error) {
    console.error('Erro ao criar conta:', error);
    res.status(400).json({ message: error.message });
  }
});

// Marcar como pago
router.put('/mark-as-paid', auth, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'IDs inválidos fornecidos' });
    }

    const { data: updatedAccounts, error } = await supabase
      .from('accounts_payable')
      .update({ is_paid: true })
      .in('id', ids)
      .eq('user_id', req.user.id)
      .select();

    if (error) throw error;

    res.status(200).json({
      message: `${updatedAccounts.length} contas atualizadas com sucesso`,
      updatedAccounts
    });
  } catch (error) {
    console.error('Erro ao marcar contas como pagas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// ... outras funções auxiliares para criação de parcelas ...

export default router;
