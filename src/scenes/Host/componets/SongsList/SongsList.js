import React, {Component} from 'react'
import PropTypes from 'prop-types'
import { map } from 'lodash'
import { compose, withHandlers } from 'recompose'
import { List } from 'material-ui/List'
import Paper from 'material-ui/Paper'
import Subheader from 'material-ui/Subheader'
import { spinnerWhileLoading } from 'utils/components'
import SongItem from '../SongItem'
import classes from './SongsList.scss'
import { connect } from 'react-redux'
import {GridList, GridTile} from 'material-ui/GridList';
import { firebaseConnect, getVal } from 'react-redux-firebase'
import IconButton from 'material-ui/IconButton'
import DeleteIcon from 'material-ui/svg-icons/action/delete'

const styles = {
    root: {
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
    },
    gridList: {
        display: 'flex',
        flexWrap: 'wrap',
        width: 500,
    },
};



const SongsList = ({onDelete,upVote,downVote,songs,admin,auth,uid}) => (
    <Paper>
        <div className={classes.list}>
            <div style={styles.root}>
                <Subheader>Songs</Subheader>
                <GridList
                    cols={1}
                    padding={1}
                    cellHeight={200}
                    style={styles.gridList}
                >
                    { songs.map( song  => {
                        return (
                            <span key={song.id}>
                                <SongItem
                                    author={ song.author }
                                    disabledUp = {song.disabledUp}
                                    disabledDown = {song.disabledDown}
                                    votes={song.song.project.votes}
                                    song={song}
                                    name={song.song.name}
                                    img={song.img}
                                    visableDelete={song.visableDelete || song.admin}
                                    active={song.active}
                                    upVote={upVote}
                                    downVote = {downVote }
                                    onDeleteClick = {onDelete}
                                    id={song.id}
                                />
                            </span>
                        )})}
                    </GridList >
                </div>
            </div>
        </Paper>
)
export default SongsList;

