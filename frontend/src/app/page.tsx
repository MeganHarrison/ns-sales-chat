import type { Metadata } from "next";
import { EcommerceMetrics } from "@/components/ecommerce/EcommerceMetrics";
import React from "react";
import MonthlyTarget from "@/components/ecommerce/MonthlyTarget";
import MonthlySalesChart from "@/components/ecommerce/MonthlySalesChart";
import StatisticsChart from "@/components/ecommerce/StatisticsChart";
import RecentOrders from "@/components/ecommerce/RecentOrders";
import DemographicCard from "@/components/ecommerce/DemographicCard";

export const metadata: Metadata = {
  title:
    "Nutrition Solutions",
  description: "Meal Prep without the Prep",
};

export default function Ecommerce() {
  return (
    <div className="min-h-screen p-6 md:p-8 lg:p-10 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Page Header */}
      <div className="mb-10 md:mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Dashboard Overview
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          Welcome back! Here's what's happening with your business today.
        </p>
      </div>

      {/* Main Content Grid with improved spacing */}
      <div className="space-y-8 md:space-y-10">
        {/* Top Section - Metrics and Target */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
          <div className="xl:col-span-7">
            <EcommerceMetrics />
          </div>
          <div className="xl:col-span-5">
            <MonthlyTarget />
          </div>
        </div>

        {/* Sales Chart Section */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
          <div className="xl:col-span-7">
            <MonthlySalesChart />
          </div>
          <div className="xl:col-span-5">
            <DemographicCard />
          </div>
        </div>

        {/* Statistics Section */}
        <StatisticsChart />

        {/* Recent Orders Section */}
        <RecentOrders />
      </div>

      {/* Footer Spacing */}
      <div className="h-10 md:h-16" />
    </div>
  );
}
