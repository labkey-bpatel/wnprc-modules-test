/*
 * Copyright (c) 2018 LabKey Corporation
 *
 * Licensed under the Apache License, Version 2.0: http://www.apache.org/licenses/LICENSE-2.0
 */

require("ehr/triggers").initScript(this);

var validItems = [];
var validRates = {};
var chargeableItemCategories = {};

function onInit(event, helper){

    LABKEY.Query.selectRows({
        requiredVersion: 9.1,
        schemaName: 'ehr_billing',
        queryName: 'chargeableItemCategories',
        columns: ['rowId, name'],
        scope: this,
        success: function (results) {

            var rows = results.rows;

            for(var i=0; i< rows.length; i++) {
                var row = rows[i];
                chargeableItemCategories[row["name"]["value"]] = row["rowId"]["value"];
            }
        },
        failure: function (error) {
            console.log(error);
        }
    });

    // Cache saved chargeable items
    LABKEY.Query.selectRows({
        requiredVersion: 9.1,
        schemaName: 'ehr_billing',
        queryName: 'chargeableItems',
        columns: ['rowid, name, departmentCode'],
        scope: this,
        success: function (results) {
            if (!results || !results.rows || results.rows.length < 1)
                return;

            for(var i=0; i<results.rows.length; i++) {
                validItems.push({"rowid":results.rows[i]["rowid"]["value"], "name":results.rows[i]["name"]["value"], "departmentCode":results.rows[i]["departmentCode"]["value"]})
            }
        },
        failure: function (error) {
            console.log(error);
        }
    });

    LABKEY.Query.selectRows({
        requiredVersion: 9.1,
        schemaName: 'ehr_billing',
        queryName: 'chargeRates',
        columns: ['chargeId, startDate, endDate'],
        scope: this,
        success: function (results) {
            if (!results || !results.rows || results.rows.length < 1)
                return;

            for(var i=0; i<results.rows.length; i++) {
                if (!validRates[results.rows[i]["chargeId"]["value"]]) {
                    validRates[results.rows[i]["chargeId"]["value"]] = [];
                }
                validRates[results.rows[i]["chargeId"]["value"]].push({"startDate":results.rows[i]["startDate"]["value"], "endDate":results.rows[i]["endDate"]["value"]})
            }
        },
        failure: function (error) {
            console.log(error);
        }
    });
}

function onInsert(helper, scriptErrors, row, oldRow) {
    var format = "E MMM dd yyyy";

    var rowChargeRateStartDate = EHR.Server.Utils.normalizeDate(row.chargeRateStartDate);
    var rowChargeRateEndDate = EHR.Server.Utils.normalizeDate(row.chargeRateEndDate);
    var rowChargeableItemStartDate = EHR.Server.Utils.normalizeDate(row.chargeableItemStartDate);
    var rowChargeableItemEndDate = EHR.Server.Utils.normalizeDate(row.chargeableItemEndDate);

    if (helper.getJavaHelper().dateCompare(rowChargeRateStartDate, rowChargeRateEndDate, format) > 0) {
        EHR.Server.Utils.addError(scriptErrors, 'chargeRateEndDate', "For charge Item " + row.name + ": Charge rate start date (" + helper.getJavaHelper().formatDate(rowChargeRateStartDate, format, false) + ") is after charge rate end date (" + helper.getJavaHelper().formatDate(rowChargeRateEndDate, format, false) + ").", 'ERROR');
        return false;
    }

    if (helper.getJavaHelper().dateCompare(rowChargeableItemStartDate, rowChargeableItemEndDate, format) > 0) {
        EHR.Server.Utils.addError(scriptErrors, 'chargeableItemEndDate', "For charge Item " + row.name + ": Charge item start date (" + helper.getJavaHelper().formatDate(rowChargeableItemStartDate, format, false) + ") is after charge item end date (" + helper.getJavaHelper().formatDate(rowChargeableItemEndDate, format, false) + ").", 'ERROR');
        return false;
    }

    var isItemUpdate = false;
    for (var i=0; i < validItems.length; i++) {
        if (validItems[i]["name"] === row.name && validItems[i]["departmentCode"] === row.departmentCode) {
            isItemUpdate = true;
            row.chargeId = validItems[i]["rowid"];
            break;
        }
    }

    if (isItemUpdate) {
        var savedStartDate, savedEndDate;
        for (var r = 0; r < validRates[row.chargeId].length; r++) {

            // Verify start date not within another range
            savedStartDate = EHR.Server.Utils.normalizeDate(validRates[row.chargeId][r].startDate);
            savedEndDate = EHR.Server.Utils.normalizeDate(validRates[row.chargeId][r].endDate);

            if (helper.getJavaHelper().dateCompare(rowChargeRateStartDate, savedStartDate, format) >= 0 && helper.getJavaHelper().dateCompare(rowChargeRateStartDate, savedEndDate, format) < 0
                    || helper.getJavaHelper().dateCompare(savedStartDate, rowChargeRateStartDate, format) >= 0 && helper.getJavaHelper().dateCompare(savedStartDate,rowChargeRateEndDate, format) < 0) {
                EHR.Server.Utils.addError(scriptErrors, 'chargeRateStartDate', "For charge Item " + row.name + ": Charge rate ("
                        + helper.getJavaHelper().formatDate(rowChargeRateStartDate, format, false) + " to " + helper.getJavaHelper().formatDate(rowChargeRateEndDate, format, false) +
                        ") overlaps a previous charge rate (" + helper.getJavaHelper().formatDate(savedStartDate, format, false) + " to " + helper.getJavaHelper().formatDate(savedEndDate, format, false) + ").", 'ERROR');
                return false;
            }

            // Verify end date not within another range
            if (helper.getJavaHelper().dateCompare(rowChargeRateEndDate, savedStartDate, format) >= 0 && helper.getJavaHelper().dateCompare(rowChargeRateEndDate, savedEndDate, format) < 0) {
                EHR.Server.Utils.addError(scriptErrors, 'chargeRateEndDate', "For charge Item " + row.name + ": Charge rate ("
                        + helper.getJavaHelper().formatDate(rowChargeRateStartDate, format, false) + " to " + helper.getJavaHelper().formatDate(rowChargeRateEndDate, format, false) +
                        ") overlaps a previous charge rate (" + helper.getJavaHelper().formatDate(savedStartDate, format, false) + " to " + helper.getJavaHelper().formatDate(savedEndDate, format, false) + ").", 'ERROR');
                return false;
            }
        }
    }

    var ciRow = {
        "name": row.name,
        "oldPk": row.oldPk,
        "chargeCategoryId": chargeableItemCategories[row.category],
        "serviceCode": row.serviceCode,
        "departmentCode": row.departmentCode,
        "comment": row.comment,
        "active": row.active,
        "container": row.container,
        "startDate": row.chargeableItemStartDate,
        "endDate": row.chargeableItemEndDate,
        "allowBlankId": row.allowBlankId
    };

    row.startDate = row.chargeRateStartDate;
    row.endDate = row.chargeRateEndDate;

    if (isItemUpdate) {
        ciRow.rowid = row.chargeId;
        LABKEY.Query.updateRows({
            schemaName: 'ehr_billing',
            queryName: 'chargeableItems',
            rows: [ciRow],
            scope: this,
            success: function (results) {
                row.chargeId = results.rows[0]["rowid"];
            },
            failure: function (error) {
                console.log("Insert rows error for ehr_billing.chargeableItems: " + error);
            }
        });
    }
    else {
        LABKEY.Query.insertRows({
            schemaName: 'ehr_billing',
            queryName: 'chargeableItems',
            rows: [ciRow],
            scope: this,
            success: function (results) {
                // Update cache
                validItems.push({"rowid":results.rows[0]["rowid"], "name":results.rows[0]["name"], "departmentCode":results.rows[0]["departmentcode"]});
                row.chargeId = results.rows[0]["rowid"];
            },
            failure: function (error) {
                console.log("Insert rows error for ehr_billing.chargeableItems: " + error);
            }
        });
    }

    if (validRates[row.chargeId]) {
        validRates[row.chargeId].push({"startDate":row.startDate, "endDate":row.endDate});
    }
    else {
        validRates[row.chargeId] = [{"startDate":row.startDate, "endDate":row.endDate}];
    }
}