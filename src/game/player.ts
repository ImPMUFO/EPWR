export type Player = {
  telegramId: number;
  username?: string;
  firstName: string;
  commanderName: string;
  realmName: string;
  gold: number;
  gems: number;
  level: number;
  xp: number;
};

export function createNewPlayer(input: {
  telegramId: number;
  username?: string;
  firstName: string;
}): Player {
  return {
    telegramId: input.telegramId,
    username: input.username,
    firstName: input.firstName,
    commanderName: input.firstName,
    realmName: "قلمرو نوپا",
    gold: 1000,
    gems: 50,
    level: 1,
    xp: 0,
  };
}
