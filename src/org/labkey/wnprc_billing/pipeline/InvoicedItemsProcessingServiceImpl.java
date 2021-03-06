/*
 * Copyright (c) 2018 LabKey Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.labkey.wnprc_billing.pipeline;

import org.apache.commons.lang3.time.DateUtils;
import org.labkey.api.ehr_billing.pipeline.BillingPipelineJobProcess;
import org.labkey.api.ehr_billing.pipeline.BillingPipelineJobSupport;
import org.labkey.api.ehr_billing.pipeline.InvoicedItemsProcessingService;
import org.labkey.wnprc_billing.WNPRC_BillingSchema;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Implements methods to define the set of queries (and their column mappings) to be included in the Billing Task processing.
 * Rows from the processed queries will be written to the ehr_billing.invoicedItems table.
 */
public class InvoicedItemsProcessingServiceImpl implements InvoicedItemsProcessingService
{
    @Override
    public List<BillingPipelineJobProcess> getProcessList()
    {
        List<BillingPipelineJobProcess> processes = new ArrayList<>();

        BillingPipelineJobProcess perDiemProcess = new BillingPipelineJobProcess("Per Diems", WNPRC_BillingSchema.NAME, "perDiemFeeRates", getPerDiemColMap())
        {
            @Override
            public Map<String, Object> getQueryParams(BillingPipelineJobSupport support)
            {
                Map<String, Object> params = super.getQueryParams(support);
                Long numDays = Math.round(((Long) (support.getEndDate().getTime() - support.getStartDate().getTime())).doubleValue() / DateUtils.MILLIS_PER_DAY);
                numDays++;
                params.put("NumDays", numDays.intValue());
                return params;
            }
        };
        perDiemProcess.setRequiredFields(Arrays.asList("date", "unitCost", "totalcost"));
        processes.add(perDiemProcess);

        BillingPipelineJobProcess proceduresProcess = new BillingPipelineJobProcess("Procedure Fees", WNPRC_BillingSchema.NAME, "procedureFeeRates", getProceduresColMap());
        proceduresProcess.setRequiredFields(Arrays.asList("date", "unitCost", "totalcost"));
        processes.add(proceduresProcess);

        BillingPipelineJobProcess miscChargesProcess = new BillingPipelineJobProcess("Misc Charges", WNPRC_BillingSchema.NAME, "miscChargesFeeRates", getMisChargesColMap());
        miscChargesProcess.setRequiredFields(Arrays.asList("date", "unitCost", "totalcost"));
        miscChargesProcess.setUseEHRContainer(true);
        miscChargesProcess.setMiscCharges(true);
        processes.add(miscChargesProcess);

        return processes;
    }

    private Map<String, String> getPerDiemColMap()
    {
        Map<String, String> colMap = new HashMap<>();
        colMap.put("Id", "Id");
        colMap.put("date", "date");
        colMap.put("project", "project");
        colMap.put("quantity", "quantity");
        colMap.put("unitCost", "unitCost");
        colMap.put("totalcost", "totalcost");
        colMap.put("unitCostDirect", "unitCostDirect");
        colMap.put("totalCostDirect", "totalCostDirect");
        colMap.put("comment", "comment");
        colMap.put("debitedAccount", "debitedAccount");
        colMap.put("chargeId", "chargeId");
        colMap.put("item", "item");
        colMap.put("category", "category");
        colMap.put("serviceCenter", "serviceCenter");
        return colMap;
    }

    private Map<String, String> getProceduresColMap()
    {
        Map<String, String> colMap = new HashMap<>();
        colMap.put("Id", "Id");
        colMap.put("date", "date");
        colMap.put("project", "project");
        colMap.put("quantity", "quantity");
        colMap.put("unitCost", "unitCost");
        colMap.put("totalcost", "totalcost");
        colMap.put("unitCostDirect", "unitCostDirect");
        colMap.put("totalCostDirect", "totalCostDirect");
        colMap.put("sourceRecord", "sourceRecord");
        colMap.put("comment", "comment");
        colMap.put("debitedAccount", "debitedAccount");
        colMap.put("chargeId", "chargeId");
        colMap.put("item", "item");
        colMap.put("category", "category");
        colMap.put("serviceCenter", "serviceCenter");
        return colMap;
    }

    private Map<String, String> getMisChargesColMap()
    {
        Map<String, String> colMap = new HashMap<>();
        colMap.put("Id", "Id");
        colMap.put("date", "date");
        colMap.put("project", "project");
        colMap.put("quantity", "quantity");
        colMap.put("unitCost", "unitCost");
        colMap.put("totalcost", "totalcost");
        colMap.put("unitCostDirect", "unitCostDirect");
        colMap.put("totalCostDirect", "totalCostDirect");
        colMap.put("sourceRecord", "sourceRecord");
        colMap.put("comment", "comment");
        colMap.put("debitedAccount", "debitedAccount");
        colMap.put("chargeId", "chargeId");
        colMap.put("item", "item");
        colMap.put("category", "category");
        colMap.put("serviceCenter", "serviceCenter");
        colMap.put("creditedAccount", "creditedAccount");
        return colMap;
    }

    @Override
    public String getInvoiceNum(Map<String, Object> row, Date billingPeriodEndDate)
    {
        SimpleDateFormat f = new SimpleDateFormat("MMddYYYY");//d = day in a month, D = day in a year
        String dateStr = f.format(billingPeriodEndDate);
        String debitedAcct = (String)row.getOrDefault("debitedAccount", "Unknown");
        return dateStr + debitedAcct.toUpperCase();
    }
}