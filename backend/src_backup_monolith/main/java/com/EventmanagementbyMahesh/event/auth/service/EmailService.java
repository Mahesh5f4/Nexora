package com.EventmanagementbyMahesh.event.auth.service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);
    private final JavaMailSender mailSender;
    
    @Value("${spring.mail.from:mahesh20104@gmail.com}")
    private String fromEmail;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendOtpEmail(String to, String otp) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(to);
        message.setSubject("Your Login OTP - Eventify");
        message.setText("Welcome to Eventify!\n\n" +
                "Your one-time password (OTP) for login is: " + otp + "\n" +
                "This OTP is valid for 5 minutes.\n\n" +
                "If you did not request this, please ignore this email.");
        mailSender.send(message);
    }

    public void sendBookingConfirmation(String to, String eventTitle, String seats, int count, double totalPrice) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject("🎟️ Booking Confirmed: " + eventTitle);

            String content = "<html><body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>" +
                    "<div style='max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;'>" +
                    "<div style='background: #6366f1; padding: 40px; text-align: center; color: white;'>" +
                    "<h1 style='margin: 0;'>Booking Confirmed!</h1>" +
                    "<p style='opacity: 0.9;'>Your tickets for " + eventTitle + " are secured.</p>" +
                    "</div>" +
                    "<div style='padding: 40px;'>" +
                    "<h2 style='color: #1e293b; margin-top: 0;'>Ticket Summary</h2>" +
                    "<table style='width: 100%; border-collapse: collapse;'>" +
                    "<tr><td style='padding: 10px 0; color: #64748b;'>Event</td><td style='padding: 10px 0; text-align: right; font-weight: bold;'>" + eventTitle + "</td></tr>" +
                    "<tr><td style='padding: 10px 0; color: #64748b;'>Tickets</td><td style='padding: 10px 0; text-align: right; font-weight: bold;'>" + count + "</td></tr>" +
                    "<tr><td style='padding: 10px 0; color: #64748b;'>Seats</td><td style='padding: 10px 0; text-align: right; font-weight: bold;'>" + seats + "</td></tr>" +
                    "<tr><td style='padding: 10px 0; color: #64748b;'>Total Paid</td><td style='padding: 10px 0; text-align: right; font-weight: bold; color: #10b981;'>₹" + totalPrice + "</td></tr>" +
                    "</table>" +
                    "<div style='margin-top: 40px; padding: 20px; background: #f8fafc; border-radius: 8px; text-align: center;'>" +
                    "<p style='margin: 0; color: #64748b; font-size: 14px;'>Please present this email or the digital ticket in your app for entry.</p>" +
                    "</div>" +
                    "</div>" +
                    "<div style='background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;'>" +
                    "&copy; 2026 EventHub. All rights reserved." +
                    "</div>" +
                    "</div>" +
                    "</body></html>";

            helper.setText(content, true);
            mailSender.send(message);
        } catch (MessagingException e) {
            logger.error("Failed to send booking confirmation email to {}: {}", to, e.getMessage());
        }
    }
}
