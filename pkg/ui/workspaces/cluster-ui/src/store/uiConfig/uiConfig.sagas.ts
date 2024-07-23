// Copyright 2023 The Cockroach Authors.
//
// Use of this software is governed by the Business Source License
// included in the file licenses/BSL.txt.
//
// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0, included in the file
// licenses/APL.txt.

import { cockroach } from "@cockroachlabs/crdb-protobuf-client";
import { all, call, delay, put, takeLatest } from "redux-saga/effects";

import { getUserSQLRoles } from "../../api/userApi";
import { maybeError, getLogger } from "../../util";
import { rootActions } from "../rootActions";
import { CACHE_INVALIDATION_PERIOD, throttleWithReset } from "../utils";

import { actions } from "./uiConfig.reducer";

export function* refreshUserSQLRolesSaga(): any {
  yield put(actions.requestUserSQLRoles());
}

export function* requestUserSQLRolesSaga(): any {
  try {
    const result: cockroach.server.serverpb.UserSQLRolesResponse =
      yield call(getUserSQLRoles);
    yield put(actions.receivedUserSQLRoles(result.roles));
  } catch (e) {
    getLogger().warn(
      maybeError(e).message,
      /* additional context */ undefined,
      e,
    );
  }
}

export function* receivedUserSQLRolesSaga(delayMs: number): any {
  yield delay(delayMs);
  yield put(actions.invalidatedUserSQLRoles());
}

export function* uiConfigSaga(
  cacheInvalidationPeriod: number = CACHE_INVALIDATION_PERIOD,
): any {
  yield all([
    throttleWithReset(
      cacheInvalidationPeriod,
      actions.refreshUserSQLRoles,
      [actions.invalidatedUserSQLRoles, rootActions.resetState],
      refreshUserSQLRolesSaga,
    ),
    takeLatest(actions.requestUserSQLRoles, requestUserSQLRolesSaga),
    takeLatest(
      actions.receivedUserSQLRoles,
      receivedUserSQLRolesSaga,
      cacheInvalidationPeriod,
    ),
  ]);
}
