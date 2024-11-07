import express from 'express';
import { auth } from '../middleware/auth.js';
import supabase from '../config/supabase.js';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const router = express.Router();

// Gerar relatório
router.get('/', auth, async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    
    let query = supabase
      .from('service_orders')
      .select(`
        *,
        client:clients(id, name),
        items:service_order_items(
          id,
          print_type,
          quantity,
          material,
          unit_value,
          total_value
        )
      `)
      .eq('user_id', req.user.id)
      .eq('active', true);

    // Aplicar filtros
    if (startDate && endDate) {
      query = query
        .gte('created_at', startDate)
        .lte('created_at', endDate);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: orders, error } = await query;

    if (error) throw error;

    // Calcular estatísticas
    const stats = {
      totalOrders: orders.length,
      totalValue: orders.reduce((acc, order) => acc + order.total_value, 0),
      ordersByStatus: orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {}),
      averageTicket: orders.length > 0 
        ? orders.reduce((acc, order) => acc + order.total_value, 0) / orders.length 
        : 0,
      totalItems: orders.reduce((acc, order) => acc + order.items.length, 0),
      mostCommonMaterials: getMostCommonMaterials(orders),
      mostCommonPrintTypes: getMostCommonPrintTypes(orders)
    };

    res.json({
      period: {
        startDate,
        endDate
      },
      stats,
      orders: orders.map(formatOrderForReport)
    });
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({ message: 'Erro ao gerar relatório' });
  }
});

// Exportar relatório
router.get('/export', auth, async (req, res) => {
  try {
    const { startDate, endDate, status, format = 'excel' } = req.query;
    
    // Buscar dados
    let query = supabase
      .from('service_orders')
      .select(`
        *,
        client:clients(id, name),
        items:service_order_items(
          id,
          print_type,
          quantity,
          material,
          unit_value,
          total_value
        )
      `)
      .eq('user_id', req.user.id)
      .eq('active', true);

    if (startDate && endDate) {
      query = query
        .gte('created_at', startDate)
        .lte('created_at', endDate);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: orders, error } = await query;

    if (error) throw error;

    // Gerar arquivo
    const buffer = await generateReport(orders, format);

    // Configurar headers para download
    const filename = `service-orders-report-${format === 'excel' ? 'xlsx' : 'csv'}`;
    res.setHeader('Content-Type', format === 'excel' 
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json({ message: 'Error exporting report' });
  }
});

export default router; 