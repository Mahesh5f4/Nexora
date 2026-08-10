package com.EventmanagementbyMahesh.event.common.service;

import com.EventmanagementbyMahesh.event.booking.entity.Booking;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.util.UUID;

@Service
public class PdfTicketService {

    public byte[] generateTicket(Booking booking) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);
            Document document = new Document(pdf);

            // Ticket Border & Background (Premium look)
            DeviceRgb primaryColor = new DeviceRgb(99, 102, 241); // #6366f1

            // Header Table
            float[] columnWidths = {1, 2};
            Table headerTable = new Table(UnitValue.createPercentArray(new float[]{70, 30}));
            headerTable.setWidth(UnitValue.createPercentValue(100));

            // Brand
            Cell brandCell = new Cell().add(new Paragraph("EventHub")
                    .setFontSize(28)
                    .setBold()
                    .setFontColor(primaryColor))
                    .setBorder(Border.NO_BORDER);
            headerTable.addCell(brandCell);

            // Ticket ID
            Cell idCell = new Cell().add(new Paragraph("TICKET #" + booking.getId())
                    .setFontSize(12)
                    .setFontColor(ColorConstants.GRAY)
                    .setTextAlignment(TextAlignment.RIGHT))
                    .setBorder(Border.NO_BORDER);
            headerTable.addCell(idCell);

            document.add(headerTable);
            document.add(new Paragraph("\n"));

            // Event Details Box
            Table detailsBox = new Table(1);
            detailsBox.setWidth(UnitValue.createPercentValue(100));
            detailsBox.setBackgroundColor(new DeviceRgb(248, 250, 252));
            detailsBox.setPadding(20);

            detailsBox.addCell(new Cell().add(new Paragraph(booking.getEventTitle())
                    .setFontSize(24)
                    .setBold())
                    .setBorder(Border.NO_BORDER));

            detailsBox.addCell(new Cell().add(new Paragraph(booking.getEventTime())
                    .setFontSize(14)
                    .setFontColor(ColorConstants.DARK_GRAY))
                    .setBorder(Border.NO_BORDER));

            detailsBox.addCell(new Cell().add(new Paragraph("📍 " + booking.getEventLocation())
                    .setFontSize(14)
                    .setFontColor(ColorConstants.DARK_GRAY))
                    .setBorder(Border.NO_BORDER));

            document.add(detailsBox);
            document.add(new Paragraph("\n"));

            // QR Code & Seat Info
            Table footerTable = new Table(UnitValue.createPercentArray(new float[]{60, 40}));
            footerTable.setWidth(UnitValue.createPercentValue(100));

            // Info
            Cell infoCell = new Cell();
            infoCell.add(new Paragraph("ATTENDEE")
                    .setFontSize(10)
                    .setFontColor(ColorConstants.GRAY));
            infoCell.add(new Paragraph(booking.getUserEmail())
                    .setFontSize(14)
                    .setBold());
            infoCell.add(new Paragraph("\n"));
            infoCell.add(new Paragraph("SEATS")
                    .setFontSize(10)
                    .setFontColor(ColorConstants.GRAY));
            infoCell.add(new Paragraph(booking.getSeats() != null ? booking.getSeats() : "General Admission")
                    .setFontSize(14)
                    .setBold());
            infoCell.setBorder(Border.NO_BORDER);
            footerTable.addCell(infoCell);

            // QR Code
            byte[] qrCode = generateQrCode("EHT-" + booking.getId() + "-" + UUID.randomUUID());
            Image qrImage = new Image(ImageDataFactory.create(qrCode));
            qrImage.setWidth(120);
            Cell qrCell = new Cell().add(qrImage).setTextAlignment(TextAlignment.RIGHT).setBorder(Border.NO_BORDER);
            footerTable.addCell(qrCell);

            document.add(footerTable);

            // Footer Note
            document.add(new Paragraph("\n\n"));
            document.add(new Paragraph("Please present this ticket at the entrance. Each QR code is valid for one entry only.")
                    .setFontSize(10)
                    .setFontColor(ColorConstants.GRAY)
                    .setTextAlignment(TextAlignment.CENTER));

            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF ticket", e);
        }
    }

    private byte[] generateQrCode(String text) throws Exception {
        QRCodeWriter qrCodeWriter = new QRCodeWriter();
        BitMatrix bitMatrix = qrCodeWriter.encode(text, BarcodeFormat.QR_CODE, 250, 250);
        
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", baos);
            return baos.toByteArray();
        }
    }
}
