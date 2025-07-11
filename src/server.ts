// src/server.ts
import app from './app';
import { config } from './config';

app.listen(config.port, () => {
  console.log(`API Gateway running on port ${config.port}`);
  console.log('Service Targets:');
  console.log(`  Patients: ${config.services.patients || 'Not Configured'}`);
  console.log(`  Clinic: ${config.services.clinic || 'Not Configured'}`);
  console.log(`  Appointments: ${config.services.appointments || 'Not Configured'}`);
  console.log(`  Auth: ${config.services.auth || 'Not Configured'}`);
});