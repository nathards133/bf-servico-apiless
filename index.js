import express from 'express';
import cors from 'cors';
import compression from 'compression';
import authHandler from './services/auth.js';
import suppliersHandler from './services/suppliers.js';
import accountsPayableHandler from './services/accountsPayable.js';
import clientsHandler from './services/clients.js';
import ordersHandler from './services/orders.js';
import dashboardHandler from './services/dashboard.js';
import serviceOrderReportsHandler from './services/serviceOrderReports.js';
import servicesHandler from './services/services.js';
import usersHandler from './services/users.js';

const app = express();

app.use(cors({
  origin: ['https://gestor-comercial-panel.vercel.app', 'http://localhost:3000','http://localhost:3001', 'https://typebot.co/my-typebot-qx2vjg5'],
  credentials: true
}));
app.use(compression());
app.use(express.json());

app.use('/api/auth', authHandler);
app.use('/api/suppliers', suppliersHandler);
app.use('/api/accounts-payable', accountsPayableHandler);
app.use('/api/clients', clientsHandler);
app.use('/api/service-orders', ordersHandler);
app.use('/api/dashboard', dashboardHandler);
app.use('/api/reports/service-orders', serviceOrderReportsHandler);
app.use('/api/services', servicesHandler);
app.use('/api/users', usersHandler);
app.get('/', (req, res) => {
  res.json({ message: 'API está funcionando!' });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Rota não encontrada' });
});

app.use((err, req, res, next) => {
  console.error('Erro no servidor:', err);
  res.status(500).json({ message: 'Erro interno do servidor' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

export default app;
