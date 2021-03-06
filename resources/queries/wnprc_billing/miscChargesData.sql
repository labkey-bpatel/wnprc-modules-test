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
PARAMETERS(StartDate TIMESTAMP, EndDate TIMESTAMP)

SELECT DISTINCT
  misc.Id,
  misc.date,
  misc.billingDate,
  misc.project,
  coalesce(misc.debitedaccount, misc.project.account) AS debitedAccount,
  misc.chargetype,
  misc.chargeId,
  misc.chargeCategory, --adjustment or reversal
  misc.objectid AS sourceRecord,
  misc.comment,
  misc.objectid,
  misc.created,
  misc.createdby,
  misc.taskId,
  misc.creditedaccount,
  misc.container,
  misc.sourceInvoicedItem,
  misc.unitCost,
  misc.quantity,
  misc.project.account AS currentActiveAlias,
  misc.project.inves AS investigator,
  TRUE AS isMiscCharge
FROM ehr_billing.miscCharges misc
WHERE cast(misc.date AS date) >= CAST(StartDate AS date) AND cast(misc.date AS date) <= CAST(EndDate AS date)