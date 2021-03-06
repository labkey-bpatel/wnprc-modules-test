/*
 * Copyright (c) 2017-2018 LabKey Corporation
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

  SELECT
    *,
    round(CAST(pdr.quantity * pdr.unitCostDirect AS DOUBLE), 2) AS totalCostDirect, -- total cost without tier rate
    round(CAST(pdr.quantity * pdr.unitCost AS DOUBLE), 2) AS totalCost -- total cost with tier rate
  FROM
    (SELECT
    pdt.id,
    pdt.adate AS date,
    pdt.project,
    pdt.account as debitedAccount,
    cr1.unitCost AS unitCostDirect, -- unit cost without tier rate
   (cr1.unitCost + (cr1.unitCost * pdt.tierRate)) AS unitCost, -- unit cost with tier rate
    pdt.quantity,
    cr1.chargeId AS chargeId,
    ci1.name AS item,
    ci1.chargeCategoryId.name AS category,
    pdt.comment,
    ci1.serviceCode AS serviceCenter,
    pdt.tierRate AS tierRate,
    NULL AS isMiscCharge
  FROM wnprc_billing.perDiemWithTierRates pdt
  LEFT JOIN ehr_billing.chargeRates cr1 ON (
    CAST(pdt.adate AS DATE) >= CAST(cr1.startDate AS DATE) AND
    (CAST(pdt.adate AS DATE) <= cr1.enddate OR cr1.enddate IS NULL))
  LEFT JOIN ehr_billing.chargeableItems ci1 ON ci1.rowid = cr1.chargeId) pdr
  WHERE pdr.item = 'Per diems'