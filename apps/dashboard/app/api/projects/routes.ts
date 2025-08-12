const coerceDates = (d?: string | Date | null) =>
  d ? (d instanceof Date ? d : new Date(d)) : null;

export const POST = async (req: Request) => {
  try {
    const json = await req.json();

    
};
