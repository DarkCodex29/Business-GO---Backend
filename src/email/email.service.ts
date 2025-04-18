import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      throw new Error('RESEND_API_KEY no está definida');
    }
    this.resend = new Resend(apiKey);
    this.fromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') ??
      'BusinessGo <onboarding@resend.dev>';
  }

  async sendWelcomeEmail(email: string, name: string) {
    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: '¡Bienvenido a BusinessGo!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">¡Bienvenido a BusinessGo!</h1>
            <p>Hola ${name},</p>
            <p>¡Gracias por unirte a BusinessGo! Estamos emocionados de tenerte con nosotros.</p>
            <p>Con BusinessGo podrás:</p>
            <ul>
              <li>Gestionar tu negocio de manera eficiente</li>
              <li>Conectar con más clientes</li>
              <li>Hacer crecer tu empresa</li>
            </ul>
            <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
            <p>¡Que tengas un excelente día!</p>
            <p>El equipo de BusinessGo</p>
          </div>
        `,
      });
    } catch (error) {
      console.error('Error sending welcome email:', error);
      throw error;
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string) {
    try {
      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ??
        'http://localhost:3000';
      const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

      await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Recuperación de Contraseña - BusinessGo',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Recuperación de Contraseña</h1>
            <p>Has solicitado restablecer tu contraseña.</p>
            <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
            <p>
              <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                Restablecer Contraseña
              </a>
            </p>
            <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
            <p>El enlace expirará en 1 hora.</p>
            <p>El equipo de BusinessGo</p>
          </div>
        `,
      });
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  }

  async sendAppointmentConfirmation(email: string, appointmentDetails: any) {
    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Confirmación de Cita - BusinessGo',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Confirmación de Cita</h1>
            <p>Tu cita ha sido confirmada con los siguientes detalles:</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
              <p><strong>Fecha:</strong> ${appointmentDetails.date}</p>
              <p><strong>Hora:</strong> ${appointmentDetails.time}</p>
              <p><strong>Servicio:</strong> ${appointmentDetails.service}</p>
              <p><strong>Empresa:</strong> ${appointmentDetails.business}</p>
            </div>
            <p>Recuerda llegar 5 minutos antes de tu cita.</p>
            <p>Si necesitas cancelar o reprogramar, hazlo con al menos 24 horas de anticipación.</p>
            <p>¡Gracias por usar BusinessGo!</p>
          </div>
        `,
      });
    } catch (error) {
      console.error('Error sending appointment confirmation:', error);
      throw error;
    }
  }
}
