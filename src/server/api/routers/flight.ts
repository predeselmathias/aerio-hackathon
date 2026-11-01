import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { areasOverlap } from "~/lib/geometry";
import { getRomaniaTime } from "~/lib/time";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const pointSchema = z.tuple([
  z.number().min(43.3).max(48.6),
  z.number().min(19.5).max(30.2),
]);

const areaSchema = z.array(pointSchema).min(3).max(60);
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
    );
  }, "Enter a valid calendar date.");
const timeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/)
  .refine((value) => {
    const [hour, minute] = value.split(":").map(Number);
    return hour! < 24 && minute! < 60;
  }, "Enter a valid time.");

const planInput = z.object({
  flightDate: dateSchema,
  startTime: timeSchema,
  endTime: timeSchema,
  area: areaSchema,
  drone: z.string().trim().min(1).max(120),
  purpose: z.string().trim().min(1).max(500),
});

export const flightRouter = createTRPCRouter({
  candidateTimes: publicProcedure
    .input(
      z.object({
        flightDate: dateSchema,
        duration: z.number().int().min(30).max(720),
        area: areaSchema,
      }),
    )
    .query(async ({ ctx, input }) => {
      const plans = await ctx.db.flightPlan.findMany({
        where: { flightDate: input.flightDate },
        select: { startTime: true, endTime: true, area: true },
      });
      const now = getRomaniaTime();
      const parseTime = (time: string) => {
        const [hour, minute] = time.split(":").map(Number);
        return hour! * 60 + minute!;
      };

      const slots: { startTime: string; endTime: string }[] = [];
      for (let start = 8 * 60; start + input.duration <= 20 * 60; start += 30) {
        if (
          input.flightDate < now.date ||
          (input.flightDate === now.date && start <= now.minutes)
        )
          continue;
        const end = start + input.duration;
        const conflict = plans.some((plan) => {
          if (
            parseTime(plan.startTime) >= end ||
            parseTime(plan.endTime) <= start
          )
            return false;
          try {
            return areasOverlap(
              input.area,
              JSON.parse(plan.area) as [number, number][],
            );
          } catch (error) {
            console.error(
              "Skipping a saved flight plan with invalid area data.",
              error,
            );
            return false;
          }
        });
        if (!conflict) {
          slots.push({
            startTime: `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`,
            endTime: `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`,
          });
        }
      }
      return slots;
    }),

  prepare: publicProcedure.input(planInput).mutation(async ({ ctx, input }) => {
    const start =
      Number(input.startTime.slice(0, 2)) * 60 +
      Number(input.startTime.slice(3));
    const end =
      Number(input.endTime.slice(0, 2)) * 60 + Number(input.endTime.slice(3));
    if (start < 8 * 60 || end > 20 * 60 || end <= start) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Choose a valid flight window between 08:00 and 20:00.",
      });
    }

    if (input.flightDate < getRomaniaTime().date) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Choose today or a future date.",
      });
    }

    return ctx.db.$transaction(async (transaction) => {
      const overlaps = await transaction.flightPlan.findMany({
        where: {
          flightDate: input.flightDate,
          startTime: { lt: input.endTime },
          endTime: { gt: input.startTime },
        },
        select: { area: true },
      });
      const conflict = overlaps.some((plan) => {
        try {
          return areasOverlap(
            input.area,
            JSON.parse(plan.area) as [number, number][],
          );
        } catch (error) {
          console.error(
            "Skipping a saved flight plan with invalid area data.",
            error,
          );
          return false;
        }
      });
      if (conflict) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "That time overlaps another Aerio planning draft in this installation. Select another candidate.",
        });
      }

      return transaction.flightPlan.create({
        data: {
          flightDate: input.flightDate,
          startTime: input.startTime,
          endTime: input.endTime,
          area: JSON.stringify(input.area),
          drone: input.drone,
          purpose: input.purpose,
        },
        select: {
          id: true,
          flightDate: true,
          startTime: true,
          endTime: true,
          createdAt: true,
        },
      });
    });
  }),
});
