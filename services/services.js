import express from 'express';
import { auth } from '../middleware/auth.js';
import supabase from '../config/supabase.js';

const router = express.Router();

// Listar serviços do usuário
router.get('/', auth, async (req, res) => {
    try {
        const { data: services, error } = await supabase
            .from('services')
            .select('*')
            .eq('user_id', req.user.id)
            .eq('active', true)
            .order('name');

        if (error) throw error;
        res.json(services);
    } catch (error) {
        console.error('Erro ao listar serviços:', error);
        res.status(500).json({ message: 'Erro ao listar serviços' });
    }
});

// Criar novo serviço
router.post('/', auth, async (req, res) => {
    try {
        const { name, description, basePrice, attributes } = req.body;

        const serviceData = {
            user_id: req.user.id,
            name,
            description,
            base_price: basePrice,
            attributes: attributes || []
        };

        const { data: service, error } = await supabase
            .from('services')
            .insert(serviceData)
            .select()
            .single();

        if (error) throw error;

        res.status(201).json(service);
    } catch (error) {
        console.error('Erro ao criar serviço:', error);
        res.status(500).json({ message: 'Erro ao criar serviço' });
    }
});

// Atualizar serviço
router.put('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, basePrice, attributes } = req.body;

        // Verificar se o serviço pertence ao usuário
        const { data: existingService, error: checkError } = await supabase
            .from('services')
            .select('id')
            .eq('id', id)
            .eq('user_id', req.user.id)
            .single();

        if (checkError || !existingService) {
            return res.status(404).json({ message: 'Serviço não encontrado' });
        }

        const serviceData = {
            name,
            description,
            base_price: basePrice,
            attributes: attributes || [],
            updated_at: new Date()
        };

        const { error: updateError } = await supabase
            .from('services')
            .update(serviceData)
            .eq('id', id);

        if (updateError) throw updateError;

        res.json({ message: 'Serviço atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar serviço:', error);
        res.status(500).json({ message: 'Erro ao atualizar serviço' });
    }
});

// Excluir serviço (soft delete)
router.delete('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('services')
            .update({ active: false })
            .eq('id', id)
            .eq('user_id', req.user.id);

        if (error) throw error;

        res.json({ message: 'Serviço excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir serviço:', error);
        res.status(500).json({ message: 'Erro ao excluir serviço' });
    }
});

export default router; 