function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatDateTimeJa(value: string | number | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = pad2(date.getMinutes());
  const second = pad2(date.getSeconds());

  return `${year}年${month}月${day}日 ${hour}時${minute}分${second}秒`;
}