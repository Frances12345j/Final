import React from "react";
import { LoadingIcon } from "./Loading";

/** Pass to <ConfigProvider spin={spinConfig}> to make every antd spinner use it. */
export const spinConfig = {
  indicator: <LoadingIcon size={22} />,
};