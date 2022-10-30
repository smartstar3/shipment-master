// services/export.js -- export file services
//
'use strict';
const PdfDocument = require('pdfkit');
const PdfTable = require('voilab-pdf-table');
const { dateFormatter } = require('../helpers/dateFuncs');

const shipmentsToPDF = async (shipments) => {
    // create a PDF from PDFKit, and a table from PDFTable
    const pdf = new PdfDocument({
        autoFirstPage: false
    });
    const table = new PdfTable(pdf, {
        bottomMargin: 30
    });

    table
        // add some plugins (here, a 'fit-to-width' for a column)
        .addPlugin(new (require('voilab-pdf-table/plugins/fitcolumn'))({
            column: 'trackingNumber'
        }))
        // set defaults to your columns
        .setColumnsDefaults({
            headerBorder: 'B',
            align: 'left'
        })
        // add table columns
        .addColumns([
            {
                id: 'trackingNumber',
                header: 'Tracking Number',
                align: 'left'
            },
            {
                id: 'organization',
                header: 'Organization',
                width: 70
            },
            {
                id: 'status',
                header: 'Status',
                width: 50
            },
            {
                id: 'vendor',
                header: 'Vendor',
                width: 40
            },
            {
                id: 'createdDate',
                header: 'Created Date',
                width: 140
            },
            {
                id: 'labelType',
                header: 'Label Type',
                width: 30
            }
        ])
        // add events (here, we draw headers on each new page)
        .onPageAdded(function (tb) {
            tb.addHeader();
        });

    // if no page already exists in your PDF, do not forget to add one
    pdf.addPage();

    const tableBody = shipments.map((item) => {
        return {
            trackingNumber: item.tn,
            organization: item.organization.name,
            status: item.status,
            vendor: item.vendor,
            createdDate: dateFormatter(new Date(item.created_date)),
            labelType: item.label.type
        };
    });

    // draw content, by passing data to the addBody method
    table.addBody(tableBody);

    return pdf;
};

const shipmentsToCSV = (shipments) => {
    const trackers = shipments.map((item) => {
        return {
            trackingNumber: item.tn,
            organization: item.organization.name,
            status: item.status,
            vendor: item.vendor,
            createdDate: dateFormatter(new Date(item.created_date)),
            labelType: item.label.type
        };
    });

    let csvContent = '';
    if (trackers.length) {
        csvContent = [
            Object.keys(trackers[0]).join(','),
            ...trackers.map(item => Object.values(item).join(','))
        ]
            .join('\n')
            .replace(/(^\[)|(\]$)/gm, '');
    }

    return csvContent;
};

module.exports = {
    shipmentsToCSV,
    shipmentsToPDF
};
