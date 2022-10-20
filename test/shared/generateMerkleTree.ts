import { keccak256, toUtf8Bytes } from "ethers/lib/utils";
import { MerkleTree } from "merkletreejs";

export async function generateMerkleTree(ticketNumber: string[]) {
    const leaves = ticketNumber.map((ticketNumber) => keccak256(toUtf8Bytes(ticketNumber)));
    const merkleTree = new MerkleTree(leaves, keccak256, {sortPairs: true});
    const merkleRoot = merkleTree.getHexRoot();

    return {merkleRoot, merkleTree};
}