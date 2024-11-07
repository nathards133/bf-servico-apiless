import express from 'express';
import { auth } from '../middleware/auth.js';
import supabase from '../config/supabase.js';

const router = express.Router();

// Função para calcular taxa de crescimento
const calculateGrowthRate = (orders) => {
    const now = new Date();
    const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const currentMonthOrders = orders.filter(o => 
        new Date(o.created_at) >= firstDayCurrentMonth
    ).length;

    const lastMonthOrders = orders.filter(o => 
        new Date(o.created_at) >= firstDayLastMonth &&
        new Date(o.created_at) <= lastDayLastMonth
    ).length;

    if (lastMonthOrders === 0) return currentMonthOrders * 100;
    return ((currentMonthOrders - lastMonthOrders) / lastMonthOrders) * 100;
};

// Função para obter serviços mais populares
const getPopularServices = (orders) => {
    // Criar mapa de serviços
    const servicesMap = new Map();
    
    orders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
                const serviceName = item.service_name || 'Sem nome';
                const currentCount = servicesMap.get(serviceName) || 0;
                servicesMap.set(serviceName, currentCount + 1);
            });
        }
    });

    // Converter para array e ordenar
    const servicesArray = Array.from(servicesMap.entries())
        .map(([name, count]) => ({
            name,
            count,
            percentage: Math.round((count / orders.length) * 100)
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Pegar os 5 mais populares

    return servicesArray;
};

// Função para obter atividades recentes
const getRecentActivity = (orders) => {
    const activities = orders
        .map(order => ({
            date: order.created_at,
            description: `${order.client?.name || 'Cliente'} - ${order.description || 'Sem descrição'}`,
            type: order.status,
            value: order.total_value
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10); // Pegar as 10 atividades mais recentes

    return activities;
};

router.get('/stats', auth, async (req, res) => {
    try {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Buscar todas as ordens do usuário
        const { data: orders, error: ordersError } = await supabase
            .from('service_orders')
            .select(`
                *,
                items:service_order_items(*)
            `)
            .eq('user_id', req.user.id)
            .eq('active', true);

        if (ordersError) throw ordersError;

        // Filtrar orçamentos (ordens com status 'pending' e sem pagamento iniciado)
        const quotations = orders.filter(o => 
            o.status === 'pending' && 
            o.payment_status === 'pending'
        );

        // Buscar orçamentos com informações do cliente
        const { data: quotationsWithClients, error: quotationsError } = await supabase
            .from('service_orders')
            .select(`
                *,
                client:clients(name)
            `)
            .eq('user_id', req.user.id)
            .eq('active', true)
            .eq('status', 'pending')
            .eq('payment_status', 'pending')
            .order('created_at', { ascending: false })
            .limit(10);

        if (quotationsError) throw quotationsError;

        // Calcular estatísticas incluindo orçamentos
        const stats = {
            totalOrders: orders.length,
            pendingOrders: orders.filter(o => o.status === 'pending').length,
            completedOrders: orders.filter(o => o.status === 'completed').length,
            expectedRevenue: orders
                .filter(o => o.payment_status === 'pending')
                .reduce((acc, o) => acc + (o.total_value || 0), 0),
            actualRevenue: orders
                .filter(o => o.payment_status === 'completed')
                .reduce((acc, o) => acc + (o.total_value || 0), 0),
            monthlyStats: {
                ordersThisMonth: orders.filter(o => 
                    new Date(o.created_at) >= firstDayOfMonth && 
                    new Date(o.created_at) <= lastDayOfMonth
                ).length,
                revenueThisMonth: orders
                    .filter(o => 
                        new Date(o.created_at) >= firstDayOfMonth && 
                        new Date(o.created_at) <= lastDayOfMonth &&
                        o.payment_status === 'completed'
                    )
                    .reduce((acc, o) => acc + (o.total_value || 0), 0),
                growthRate: calculateGrowthRate(orders)
            },
            popularServices: getPopularServices(orders),
            recentActivity: getRecentActivity(orders),
            quotationStats: {
                total: quotations.length,
                thisMonth: quotations.filter(o => 
                    new Date(o.created_at) >= firstDayOfMonth && 
                    new Date(o.created_at) <= lastDayOfMonth
                ).length,
                approved: orders.filter(o => 
                    o.status !== 'pending' && 
                    o.created_at >= firstDayOfMonth
                ).length,
                pending: quotations.filter(o => o.status === 'pending').length,
                totalValue: quotations.reduce((acc, o) => acc + (o.total_value || 0), 0)
            },
            quotes: quotationsWithClients.map(quote => ({
                id: quote.id,
                clientName: quote.client?.name,
                createdAt: quote.created_at,
                status: quote.status,
                totalValue: quote.total_value,
                description: quote.description
            }))
        };

        res.json(stats);
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ message: 'Erro ao buscar estatísticas' });
    }
});

export default router;